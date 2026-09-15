import db from '../api/db.js';
import { io as ClientIO } from 'socket.io-client';
import { server, emitOrderValidated, parsePaymentNotification } from '../api/server.js';

async function runTests() {
  console.log('🧪 Démarrage de la suite de tests automatisée (CI/CD)...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  let clientSocket = null;
  const BASE_URL = 'http://localhost:3000';

  try {
    // 1. Initialisation de la base SQLite, purge et seeding propre
    await db.initDb();
    await db.checkAndExpireOrders();
    await db.run("DELETE FROM orders WHERE customer_name LIKE 'Client CI%'");
    await db.run("DELETE FROM order_items WHERE order_id NOT IN (SELECT id FROM orders)");
    await db.run("UPDATE products SET stock = 20 WHERE id = 1");

    // 2. Catalogue de produits
    const products = await db.getAllProducts();
    assert(products.length >= 18, `Catalogue complet initialisé (${products.length} produits)`);

    const prod1 = await db.getProductById(1);
    assert(prod1 && prod1.name === 'Poulet braisé', 'Lecture du produit ID 1 (Poulet braisé)');
    const initialStock = prod1.stock;

    // 3. Authentification Staff & RBAC
    const caisseUser = await db.getStaffByPin('1234');
    assert(caisseUser && caisseUser.role === 'caisse', 'Identification caisse par PIN 1234');

    const cuisineUser = await db.getStaffByPin('5678');
    assert(cuisineUser && cuisineUser.role === 'cuisine', 'Identification cuisine par PIN 5678');

    const adminUser = await db.getStaffByPin('0000');
    assert(adminUser && adminUser.role === 'admin', 'Identification administrateur par PIN 0000');

    const superAdminUser = await db.getStaffByPin('9999');
    assert(superAdminUser && superAdminUser.role === 'superadmin', 'Identification SuperAdmin SaaS par PIN 9999');

    const invalidUser = await db.getStaffByPin('8888');
    assert(!invalidUser, 'Rejet d\'un code PIN inconnu (8888)');

    // 4. Création de commande & Réservation atomique du stock
    const testOrder = {
      restaurantId: 'resto-premium-01',
      customerName: 'Client CI Test',
      numeroClient: '77123456',
      tableNumber: 12,
      specialNotes: 'Sans piment',
      items: [
        {
          id: 1,
          quantity: 2,
          price: prod1.price,
          product: { id: 1, name: prod1.name, price: prod1.price }
        }
      ],
      montantTotal: prod1.price * 2
    };

    const createdOrder = await db.createOrderTransaction(testOrder);
    assert(createdOrder && createdOrder.id.startsWith('CMD-'), 'Création de commande avec ID unique');

    const prod1After = await db.getProductById(1);
    assert(prod1After.stock === initialStock - 2, `Stock atomiquement décrémenté (${initialStock} -> ${prod1After.stock})`);

    // 5. Atomicité / Rollback en cas de stock insuffisant
    let errorTriggered = false;
    try {
      await db.createOrderTransaction({
        ...testOrder,
        items: [{ id: 1, quantity: 99999, price: prod1.price }]
      });
    } catch (e) {
      errorTriggered = true;
    }
    assert(errorTriggered, 'Rejet immédiat si stock insuffisant');

    const prod1Rollback = await db.getProductById(1);
    assert(prod1Rollback.stock === initialStock - 2, 'Garantie ACID : aucun stock décrémenté après échec');

    // 6. Annulation par le client & Restitution du stock
    await db.cancelOrderClient(createdOrder.id);
    const prod1Restored = await db.getProductById(1);
    assert(prod1Restored.stock === initialStock, `Restitution intégrale du stock après annulation (${prod1Restored.stock})`);

    const cancelledOrder = await db.getOrderById(createdOrder.id);
    assert(cancelledOrder.statut === 'ANNULEE_PAR_CLIENT', 'Statut mis à jour en ANNULEE_PAR_CLIENT');

    // 7. Cycle complet : Caisse -> Cuisine
    const orderForPrep = await db.createOrderTransaction(testOrder);
    const pendingCaisse = await db.getPendingCaisseOrders();
    assert(pendingCaisse.some(o => o.id === orderForPrep.id), 'Commande en attente visible en Caisse');

    await db.validateOrderCaisse(orderForPrep.id);
    const validatedOrder = await db.getOrderById(orderForPrep.id);
    assert(validatedOrder.statut === 'EN_PREPARATION', 'Statut passé à EN_PREPARATION après validation caisse');

    const activeCuisine = await db.getActiveCuisineOrders();
    assert(activeCuisine.some(o => o.id === orderForPrep.id), 'Commande transmise au KDS Cuisine');

    await db.finishOrderCuisine(orderForPrep.id);
    const readyOrder = await db.getOrderById(orderForPrep.id);
    assert(readyOrder.statut === 'PRETE', 'Commande terminée et marquée PRETE à servir');

    // 8. Multi-Paiements Mobile Money : Moov Money & Wave
    const moovOrder = await db.createOrderTransaction({
      ...testOrder,
      modePaiement: 'moov_money'
    });
    assert(moovOrder.modePaiement === 'moov_money', 'Support du mode Moov Money');

    const waveOrder = await db.createOrderTransaction({
      ...testOrder,
      modePaiement: 'wave'
    });
    assert(waveOrder.modePaiement === 'wave', 'Support du mode Wave');

    // Changement d'opérateur en cours de route
    await db.updateOrderPaymentMethod(moovOrder.id, 'wave');
    const updatedOrder = await db.getOrderById(moovOrder.id);
    assert(updatedOrder.modePaiement === 'wave', 'Bascule dynamique d\'opérateur réussie (Moov -> Wave)');

    // 9. Synchronisation Temps Réel WebSockets (Socket.io)
    clientSocket = ClientIO('http://localhost:3000', {
      transports: ['websocket'],
      forceNew: true
    });

    await new Promise((resolve) => {
      clientSocket.on('connect', resolve);
    });
    assert(clientSocket.connected, 'Connexion client WebSocket établie avec succès');

    // Test de réception d\'événement en temps réel dans une salle de commande
    const eventPromise = new Promise((resolve) => {
      clientSocket.on('order:status_changed', (payload) => {
        resolve(payload);
      });
    });

    clientSocket.emit('join:order', 'CMD-SOCKET-REALTIME-99');
    await new Promise(r => setTimeout(r, 120));

    emitOrderValidated({ id: 'CMD-SOCKET-REALTIME-99', statut: 'EN_PREPARATION' });

    const receivedPayload = await Promise.race([
      eventPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout WebSocket')), 3000))
    ]);

    assert(
      receivedPayload && receivedPayload.statut === 'EN_PREPARATION',
      'Notification temps réel reçue instantanément via WebSocket'
    );

    // 10. Architecture Multi-Tenant (Multi-Restaurants) & SuperAdmin
    const allRestaurants = await db.getAllRestaurants();
    assert(allRestaurants.length >= 2, `Multi-Tenant : ${allRestaurants.length} restaurants enregistrés`);

    const braiseProfile = await db.getRestaurantByIdOrSlug('le-braise');
    assert(
      braiseProfile && braiseProfile.orange_merchant === '778899' && braiseProfile.moov_merchant === '99887',
      'Configuration marchande Mobile Money isolée par restaurant (Le Braisé)'
    );

    const braiseProducts = await db.getAllProducts('le-braise-02');
    assert(
      braiseProducts.length > 0 && braiseProducts.some(p => p.name.includes('Braisé Royal')),
      'Isolation étanche du catalogue de produits par restaurant'
    );

    const platformStats = await db.getPlatformStats();
    assert(
      platformStats && platformStats.activeRestaurants >= 2,
      'Calcul des statistiques globales consolidées de la plateforme SaaS'
    );

    // 11. Passerelle Webhook & Validation Automatique des Paiements (Orange Money / MacroDroid Bridge)
    const testSms = "Vous avez recu 3500 FCFA de +226 70 12 34 56. Trans ID: CI240915.1010. Nouveau solde: 55000 FCFA.";
    const parsedSms = parsePaymentNotification(testSms);
    assert(
      parsedSms.amount === 3500 && parsedSms.senderPhone === '70123456' && parsedSms.transactionRef === 'CI240915.1010',
      'Parsing lexical du SMS Orange Money (Montant, Expéditeur, Trans ID)'
    );

    // Rejet si secret webhook manquant ou invalide (Sécurité Anti-Fraude)
    const unauthRes = await fetch(`${BASE_URL}/api/webhooks/orange-money-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: testSms })
    });
    assert(
      unauthRes.status === 401,
      'Sécurité Webhook : Rejet immédiat (401) si le secret est absent ou invalide'
    );

    // Création d'une commande cible pour test de réconciliation
    const webhookOrder = await db.createOrderTransaction({
      restaurantId: 'resto-premium-01',
      customerName: 'Client CI Webhook',
      numeroClient: '70123456',
      tableNumber: 8,
      montantTotal: 3500,
      items: [{ id: 1, name: 'Poulet braisé', quantity: 1, price: 3500 }]
    });

    // Envoi du webhook avec authentification valide
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/orange-money/resto-premium-01`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': 'resto_secret_2026'
      },
      body: JSON.stringify({ message: testSms })
    });
    const webhookData = await webhookRes.json();
    assert(
      webhookData.success === true && webhookData.matched === true && webhookData.orderId === webhookOrder.id,
      'Réconciliation automatique réussie de la commande via Webhook MacroDroid'
    );

    const updatedWebhookOrder = await db.getOrderById(webhookOrder.id);
    assert(
      updatedWebhookOrder.statut === 'EN_PREPARATION' && updatedWebhookOrder.transactionRef === 'CI240915.1010',
      'Mise à jour du statut en EN_PREPARATION avec enregistrement du Trans ID'
    );

    // Idempotence : Le même SMS renvoyé doit être détecté comme doublon sans erreur
    const duplicateRes = await fetch(`${BASE_URL}/api/webhooks/orange-money/resto-premium-01`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': 'resto_secret_2026'
      },
      body: JSON.stringify({ message: testSms })
    });
    const duplicateData = await duplicateRes.json();
    assert(
      duplicateData.success === true && duplicateData.duplicate === true,
      'Idempotence garantie : détection et rejet d\'un SMS déjà traité'
    );

    // Isolation Multi-Tenant : un webhook pour le restaurant B ne valide pas une commande du restaurant A
    const braiseOrder = await db.createOrderTransaction({
      restaurantId: 'le-braise-02',
      customerName: 'Client CI Braise',
      numeroClient: '78000000',
      tableNumber: 3,
      montantTotal: 4500,
      items: [{ id: 1, name: 'Poulet braisé', quantity: 1, price: 4500 }]
    });

    // Envoi vers le mauvais restaurant (resto-premium-01)
    const crossTenantRes = await fetch(`${BASE_URL}/api/webhooks/orange-money/resto-premium-01`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'resto_secret_2026' },
      body: JSON.stringify({ message: 'Vous avez recu 4500 FCFA de 78000000. Ref: OM-DIFF-01.' })
    });
    const crossTenantData = await crossTenantRes.json();
    assert(
      crossTenantData.matched === false,
      'Isolation étanche : un webhook pour un restaurant ne valide pas les commandes d\'un autre établissement'
    );

    // Envoi vers le bon restaurant (le-braise-02)
    const rightTenantRes = await fetch(`${BASE_URL}/api/webhooks/orange-money/le-braise-02`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'resto_secret_2026' },
      body: JSON.stringify({ message: 'Vous avez recu 4500 FCFA de 78000000. Ref: OM-DIFF-01.' })
    });
    const rightTenantData = await rightTenantRes.json();
    assert(
      rightTenantData.matched === true && rightTenantData.orderId === braiseOrder.id,
      'Routage tenant précis : validation automatique sur le bon établissement'
    );

    // 12. Nettoyage et isolation des tests
    await db.run("DELETE FROM orders WHERE customer_name LIKE 'Client CI%'");
    await db.run("DELETE FROM order_items WHERE order_id NOT IN (SELECT id FROM orders)");
    await db.run("UPDATE products SET stock = ? WHERE id = 1", [initialStock]);

    if (clientSocket) {
      clientSocket.disconnect();
    }
    server.close();

    console.log(`\n📊 Bilan des tests : ${passed}/${total} assertions réussies avec succès.`);
    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('\n❌ Erreur inattendue durant l\'exécution des tests :', err);
    if (clientSocket) clientSocket.disconnect();
    server.close();
    process.exit(1);
  }
}

runTests();
