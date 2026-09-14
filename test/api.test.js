import db from '../api/db.js';

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

  try {
    // 1. Initialisation de la base SQLite et seeding
    await db.initDb();

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

    const invalidUser = await db.getStaffByPin('9999');
    assert(!invalidUser, 'Rejet d\'un code PIN inconnu (9999)');

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

    console.log(`\n📊 Bilan des tests : ${passed}/${total} assertions réussies avec succès.`);
    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('\n❌ Erreur inattendue durant l\'exécution des tests :', err);
    process.exit(1);
  }
}

runTests();

