import db from '../api/db.js';
import { io as ClientIO } from 'socket.io-client';
import { server, emitOrderValidated } from '../api/server.js';

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

    // 11. Nettoyage et isolation des tests
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
