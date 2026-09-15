import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'resto.db');
const productsJsonPath = path.join(__dirname, 'products.json');

const db = new sqlite3.Database(dbPath);

// Fonctions utilitaires Promisifiées
export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// ==========================================
// INITIALISATION DU SCHÉMA & SEEDING
// ==========================================
export async function initDb() {
  await run('PRAGMA foreign_keys = ON');

  // 1. Table Restaurants (Multi-Tenant)
  await run(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      city TEXT DEFAULT 'Ouagadougou',
      currency TEXT DEFAULT 'FCFA',
      orange_merchant TEXT DEFAULT '654321',
      moov_merchant TEXT DEFAULT '54321',
      wave_merchant TEXT DEFAULT 'resto-premium',
      wave_url TEXT DEFAULT 'https://pay.wave.com/m/resto-premium',
      logo TEXT,
      plan TEXT DEFAULT 'pro',
      statut TEXT DEFAULT 'ACTIF',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Table Produits
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id TEXT DEFAULT 'resto-premium-01',
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      image TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration de restaurant_id sur products si la table existait déjà
  try {
    await run(`ALTER TABLE products ADD COLUMN restaurant_id TEXT DEFAULT 'resto-premium-01'`);
  } catch (err) {}

  // 3. Table Commandes (avec mode de paiement et restaurant_id)
  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT DEFAULT 'resto-premium-01',
      customer_name TEXT NOT NULL,
      numero_client TEXT,
      customer_phone TEXT,
      table_number INTEGER NOT NULL,
      special_notes TEXT,
      montant_total INTEGER NOT NULL,
      mode_paiement TEXT DEFAULT 'orange_money',
      statut TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      paid_at DATETIME,
      ready_at DATETIME,
      cancelled_at DATETIME
    )
  `);

  try {
    await run(`ALTER TABLE orders ADD COLUMN mode_paiement TEXT DEFAULT 'orange_money'`);
  } catch (err) {}

  // 4. Table Articles de Commande
  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      product_image TEXT,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // 5. Table Personnel (Staff)
  await run(`
    CREATE TABLE IF NOT EXISTS staff_users (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT DEFAULT 'resto-premium-01',
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin TEXT NOT NULL
    )
  `);

  try {
    await run(`ALTER TABLE staff_users ADD COLUMN restaurant_id TEXT DEFAULT 'resto-premium-01'`);
  } catch (err) {}

  // Seeding Restaurants si table vide
  const restoCount = await get('SELECT COUNT(*) as count FROM restaurants');
  if (restoCount.count === 0) {
    await run(`
      INSERT INTO restaurants (id, name, slug, phone, address, city, currency, orange_merchant, moov_merchant, wave_merchant, wave_url, logo, plan, statut)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'resto-premium-01',
      'RestoPremium Ouaga',
      'resto-premium',
      '+226 70 00 00 01',
      'Avenue Kwame Nkrumah',
      'Ouagadougou',
      'FCFA',
      '654321',
      '54321',
      'resto-premium',
      'https://pay.wave.com/m/resto-premium',
      '/assets/couverture.png',
      'enterprise',
      'ACTIF'
    ]);

    await run(`
      INSERT INTO restaurants (id, name, slug, phone, address, city, currency, orange_merchant, moov_merchant, wave_merchant, wave_url, logo, plan, statut)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'le-braise-02',
      'Le Braisé Gourmet',
      'le-braise',
      '+226 76 00 00 02',
      'Zone du Bois',
      'Ouagadougou',
      'FCFA',
      '778899',
      '99887',
      'le-braise',
      'https://pay.wave.com/m/le-braise',
      '/assets/poulet.jpg',
      'pro',
      'ACTIF'
    ]);
    console.log('🏢 Seeding initial : 2 restaurants créés dans SQLite.');
  }

  // Seeding Produits si table vide
  const productCount = await get('SELECT COUNT(*) as count FROM products');
  if (productCount.count === 0 && fs.existsSync(productsJsonPath)) {
    try {
      const initialProducts = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8') || '[]');
      for (const p of initialProducts) {
        await run(
          `INSERT INTO products (id, restaurant_id, name, category, price, description, image, stock)
           VALUES (?, 'resto-premium-01', ?, ?, ?, ?, ?, ?)`,
          [p.id, p.name, p.category, p.price, p.description || '', p.image || '', Number(p.stock) || 25]
        );
      }
      console.log(`📦 Seeding initial : ${initialProducts.length} produits importés dans SQLite.`);
    } catch (err) {
      console.error('Erreur lors du seeding des produits:', err);
    }
  }

  // Seeding de produits exclusifs pour le restaurant 2 (Le Braisé Gourmet)
  const braiseProdCount = await get("SELECT COUNT(*) as count FROM products WHERE restaurant_id = 'le-braise-02'");
  if (braiseProdCount.count === 0) {
    await run(
      `INSERT INTO products (restaurant_id, name, category, price, description, image, stock) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['le-braise-02', 'Poulet Braisé Royal Gourmet', 'Plats', 6500, 'Poulet fermier mariné aux épices du chef et braisé au bois de savane.', '/assets/poulet.jpg', 20]
    );
    await run(
      `INSERT INTO products (restaurant_id, name, category, price, description, image, stock) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['le-braise-02', 'Dibi d Agneau Grillé', 'Plats', 7000, 'Morceaux d agneau grillés et assaisonnés aux oignons moutarde.', '/assets/thieb.jpg', 15]
    );
    await run(
      `INSERT INTO products (restaurant_id, name, category, price, description, image, stock) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['le-braise-02', 'Alloco Spécial Braisé', 'Accompagnements', 1500, 'Bananes plantains frites dorées avec sauce tomate pimentée.', '/assets/alloco.jpg', 30]
    );
  }

  // Seeding Utilisateurs Staff si table vide
  const staffCount = await get('SELECT COUNT(*) as count FROM staff_users');
  if (staffCount.count === 0) {
    await run(`INSERT INTO staff_users (id, restaurant_id, name, role, pin) VALUES ('caisse-01', 'resto-premium-01', 'Caisse Principale', 'caisse', '1234')`);
    await run(`INSERT INTO staff_users (id, restaurant_id, name, role, pin) VALUES ('cuisine-01', 'resto-premium-01', 'Chef de Cuisine', 'cuisine', '5678')`);
    await run(`INSERT INTO staff_users (id, restaurant_id, name, role, pin) VALUES ('admin-01', 'resto-premium-01', 'Gérant RestoPremium', 'admin', '0000')`);
    console.log(`👥 Seeding initial : 3 comptes staff créés dans SQLite.`);
  }

  // Compte SuperAdmin SaaS central
  const superAdmin = await get("SELECT * FROM staff_users WHERE role = 'superadmin'");
  if (!superAdmin) {
    await run(`INSERT INTO staff_users (id, restaurant_id, name, role, pin) VALUES ('superadmin-01', '*', 'Super Administrateur SaaS', 'superadmin', '9999')`);
  }

  console.log('✅ Base de données SQLite connectée et prête.');
}

// ==========================================
// MÉTIER : RESTAURANTS (MULTI-TENANT)
// ==========================================
export async function getAllRestaurants() {
  const rows = await all('SELECT * FROM restaurants ORDER BY created_at DESC');
  const enriched = [];
  for (const r of rows) {
    const stats = await get(`
      SELECT COUNT(*) as orderCount, COALESCE(SUM(montant_total), 0) as totalVolume
      FROM orders
      WHERE restaurant_id = ? AND statut IN ('PAYEE', 'EN_PREPARATION', 'PRETE')
    `, [r.id]);
    enriched.push({
      ...r,
      orderCount: stats?.orderCount || 0,
      totalVolume: stats?.totalVolume || 0
    });
  }
  return enriched;
}

export async function getRestaurantByIdOrSlug(idOrSlug) {
  if (!idOrSlug) return null;
  return get(
    'SELECT * FROM restaurants WHERE id = ? OR slug = ?',
    [String(idOrSlug), String(idOrSlug)]
  );
}

export async function createRestaurant(data) {
  const id = data.id || `resto-${Date.now().toString(36)}`;
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const name = data.name;
  if (!name) throw new Error('Le nom du restaurant est obligatoire');

  const phone = data.phone || '';
  const address = data.address || '';
  const city = data.city || 'Ouagadougou';
  const currency = data.currency || 'FCFA';
  const orangeMerchant = data.orangeMerchant || data.orange_merchant || '654321';
  const moovMerchant = data.moovMerchant || data.moov_merchant || '54321';
  const waveMerchant = data.waveMerchant || data.wave_merchant || slug;
  const waveUrl = data.waveUrl || data.wave_url || `https://pay.wave.com/m/${slug}`;
  const plan = data.plan || 'pro';
  const statut = data.statut || 'ACTIF';
  const logo = data.logo || '/assets/couverture.png';

  await run(`
    INSERT INTO restaurants (id, name, slug, phone, address, city, currency, orange_merchant, moov_merchant, wave_merchant, wave_url, logo, plan, statut)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, name, slug, phone, address, city, currency, orangeMerchant, moovMerchant, waveMerchant, waveUrl, logo, plan, statut]);

  // Compte caisse et cuisine par défaut pour ce restaurant
  await run(
    `INSERT INTO staff_users (id, restaurant_id, name, role, pin) VALUES (?, ?, ?, 'caisse', '1234')`,
    [`caisse-${id}`, id, `Caisse ${name}`]
  );
  await run(
    `INSERT INTO staff_users (id, restaurant_id, name, role, pin) VALUES (?, ?, ?, 'cuisine', '5678')`,
    [`cuisine-${id}`, id, `Cuisine ${name}`]
  );

  return getRestaurantByIdOrSlug(id);
}

export async function updateRestaurant(id, data) {
  const existing = await get('SELECT * FROM restaurants WHERE id = ?', [id]);
  if (!existing) throw new Error('Restaurant non trouvé');

  const name = data.name ?? existing.name;
  const phone = data.phone ?? existing.phone;
  const address = data.address ?? existing.address;
  const city = data.city ?? existing.city;
  const currency = data.currency ?? existing.currency;
  const orangeMerchant = data.orangeMerchant ?? data.orange_merchant ?? existing.orange_merchant;
  const moovMerchant = data.moovMerchant ?? data.moov_merchant ?? existing.moov_merchant;
  const waveMerchant = data.waveMerchant ?? data.wave_merchant ?? existing.wave_merchant;
  const waveUrl = data.waveUrl ?? data.wave_url ?? existing.wave_url;
  const plan = data.plan ?? existing.plan;
  const statut = data.statut ?? existing.statut;
  const logo = data.logo ?? existing.logo;

  await run(`
    UPDATE restaurants 
    SET name = ?, phone = ?, address = ?, city = ?, currency = ?, 
        orange_merchant = ?, moov_merchant = ?, wave_merchant = ?, wave_url = ?, 
        logo = ?, plan = ?, statut = ?
    WHERE id = ?
  `, [name, phone, address, city, currency, orangeMerchant, moovMerchant, waveMerchant, waveUrl, logo, plan, statut, id]);

  return getRestaurantByIdOrSlug(id);
}

export async function getPlatformStats() {
  const restoCount = await get("SELECT COUNT(*) as count FROM restaurants WHERE statut = 'ACTIF'");
  const ordersStats = await get(`
    SELECT COUNT(*) as totalOrders, COALESCE(SUM(montant_total), 0) as totalVolume
    FROM orders
    WHERE statut IN ('PAYEE', 'EN_PREPARATION', 'PRETE')
  `);
  const productsCount = await get("SELECT COUNT(*) as count FROM products");

  return {
    activeRestaurants: restoCount?.count || 0,
    totalOrders: ordersStats?.totalOrders || 0,
    totalVolumeFCFA: ordersStats?.totalVolume || 0,
    totalProducts: productsCount?.count || 0
  };
}

// ==========================================
// MÉTIER : CATALOGUE PRODUITS
// ==========================================
export async function getAllProducts(restaurantId) {
  if (restaurantId && restaurantId !== '*') {
    return all(
      'SELECT id, restaurant_id, name, category, price, description, image, stock FROM products WHERE restaurant_id = ? ORDER BY id ASC',
      [restaurantId]
    );
  }
  return all('SELECT id, restaurant_id, name, category, price, description, image, stock FROM products ORDER BY id ASC');
}

export async function getProductById(id) {
  return get('SELECT id, restaurant_id, name, category, price, description, image, stock FROM products WHERE id = ?', [id]);
}

// ==========================================
// MÉTIER : AUTHENTIFICATION STAFF
// ==========================================
export async function getStaffByPin(pin, restaurantId) {
  const cleanPin = String(pin).trim();
  if (restaurantId && restaurantId !== '*') {
    return get(
      `SELECT id, restaurant_id, name, role, pin FROM staff_users WHERE pin = ? AND (restaurant_id = ? OR restaurant_id = '*')`,
      [cleanPin, restaurantId]
    );
  }
  return get('SELECT id, restaurant_id, name, role, pin FROM staff_users WHERE pin = ?', [cleanPin]);
}

// ==========================================
// MÉTIER : COMMANDES & TRANSACTIONS ACID
// ==========================================

// Formate une commande de la BD vers la structure attendue par le frontend
function formatOrder(orderRow, items = []) {
  if (!orderRow) return null;

  const formattedItems = items.map(item => ({
    id: item.product_id,
    quantity: item.quantity,
    price: item.unit_price,
    product: {
      id: item.product_id,
      name: item.product_name,
      image: item.product_image,
      price: item.unit_price
    }
  }));

  return {
    id: orderRow.id,
    orderId: orderRow.id,
    restaurantId: orderRow.restaurant_id,
    customerName: orderRow.customer_name,
    numeroClient: orderRow.numero_client || orderRow.customer_phone || '',
    customerPhone: orderRow.customer_phone || orderRow.numero_client || '',
    tableNumber: orderRow.table_number,
    specialNotes: orderRow.special_notes || '',
    montantTotal: orderRow.montant_total,
    total: orderRow.montant_total,
    modePaiement: orderRow.mode_paiement || 'orange_money',
    mode_paiement: orderRow.mode_paiement || 'orange_money',
    statut: orderRow.statut,
    status: orderRow.statut,
    createdAt: orderRow.created_at,
    expiresAt: orderRow.expires_at,
    paidAt: orderRow.paid_at,
    readyAt: orderRow.ready_at,
    isPaid: orderRow.statut === 'EN_PREPARATION' || orderRow.statut === 'PRETE',
    items: formattedItems
  };
}

// Expiration automatique TTL 10 minutes avec restitution de stock
export async function checkAndExpireOrders() {
  const now = new Date().toISOString();
  // Recherche des commandes expirées
  const expiredOrders = await all(
    `SELECT id FROM orders WHERE statut = 'EN_ATTENTE_DE_PAIEMENT' AND expires_at < ?`,
    [now]
  );

  const expiredIds = [];
  for (const exp of expiredOrders) {
    // Transaction pour marquer expiré et restituer les stocks
    await run('BEGIN TRANSACTION');
    try {
      await run(
        `UPDATE orders SET statut = 'ANNULEE_EXPIREE', cancelled_at = ? WHERE id = ?`,
        [now, exp.id]
      );

      const items = await all(`SELECT product_id, quantity FROM order_items WHERE order_id = ?`, [exp.id]);
      for (const item of items) {
        await run(
          `UPDATE products SET stock = stock + ? WHERE id = ?`,
          [item.quantity, item.product_id]
        );
      }
      await run('COMMIT');
      expiredIds.push(exp.id);
    } catch (err) {
      await run('ROLLBACK');
      console.error(`Erreur expiration commande ${exp.id}:`, err);
    }
  }
  return expiredIds;
}

// Création de commande avec vérification et réservation transactionnelle
export async function createOrderTransaction(orderData) {
  const {
    restaurantId = 'resto-premium-01',
    customerName = 'Client',
    numeroClient = '',
    customerPhone = '',
    tableNumber = 1,
    specialNotes = '',
    modePaiement = 'orange_money',
    mode_paiement = 'orange_money',
    items = [],
    montantTotal = 0,
    total = 0
  } = orderData;

  const finalPhone = numeroClient || customerPhone || '';
  const finalTotal = Number(montantTotal || total || 0);
  const finalPaymentMethod = modePaiement || mode_paiement || 'orange_money';

  if (!items || items.length === 0) {
    throw new Error('Le panier est vide');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const orderId = `CMD-${Date.now()}`;

  // Début de la Transaction Atomique
  await run('BEGIN TRANSACTION');
  try {
    // 1. Vérification de la disponibilité de tous les articles
    for (const item of items) {
      const prodId = item.id || (item.product && item.product.id);
      const qty = Number(item.quantity) || 1;

      const product = await get('SELECT id, name, stock FROM products WHERE id = ?', [prodId]);
      if (!product) {
        throw new Error(`Produit introuvable (ID ${prodId})`);
      }
      if (product.stock < qty) {
        throw new Error(`Stock insuffisant pour ${product.name} (Restant: ${product.stock})`);
      }
    }

    // 2. Décrémentation atomique des stocks
    for (const item of items) {
      const prodId = item.id || (item.product && item.product.id);
      const qty = Number(item.quantity) || 1;
      await run('UPDATE products SET stock = stock - ? WHERE id = ?', [qty, prodId]);
    }

    // 3. Insertion de la commande avec mode de paiement
    await run(
      `INSERT INTO orders (id, restaurant_id, customer_name, numero_client, customer_phone, table_number, special_notes, montant_total, mode_paiement, statut, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'EN_ATTENTE_DE_PAIEMENT', ?, ?)`,
      [orderId, restaurantId, customerName, finalPhone, finalPhone, Number(tableNumber) || 1, specialNotes, finalTotal, finalPaymentMethod, now.toISOString(), expiresAt]
    );

    // 4. Insertion des lignes de commande (order_items)
    for (const item of items) {
      const prodId = item.id || (item.product && item.product.id);
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.price || (item.product && item.product.price) || 0);
      const prodName = item.product?.name || item.name || 'Produit';
      const prodImage = item.product?.image || item.image || '';

      await run(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, prodId, prodName, prodImage, qty, unitPrice]
      );
    }

    await run('COMMIT');

    return {
      id: orderId,
      orderId: orderId,
      restaurantId,
      customerName,
      numeroClient: finalPhone,
      customerPhone: finalPhone,
      tableNumber: Number(tableNumber) || 1,
      specialNotes,
      modePaiement: finalPaymentMethod,
      mode_paiement: finalPaymentMethod,
      items,
      montantTotal: finalTotal,
      total: finalTotal,
      statut: 'EN_ATTENTE_DE_PAIEMENT',
      status: 'EN_ATTENTE_DE_PAIEMENT',
      createdAt: now.toISOString(),
      expiresAt
    };
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
}

// Récupération d'une commande par son ID
export async function getOrderById(orderId) {
  await checkAndExpireOrders();

  const orderRow = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!orderRow) return null;

  const items = await all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  return formatOrder(orderRow, items);
}

// Annulation par le client
export async function cancelOrderClient(orderId) {
  const orderRow = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!orderRow) {
    throw new Error('Commande non trouvée');
  }

  if (orderRow.statut !== 'EN_ATTENTE_DE_PAIEMENT') {
    throw new Error("Impossible d'annuler une commande déjà payée ou expirée");
  }

  const now = new Date().toISOString();

  await run('BEGIN TRANSACTION');
  try {
    await run(
      `UPDATE orders SET statut = 'ANNULEE_PAR_CLIENT', cancelled_at = ? WHERE id = ?`,
      [now, orderId]
    );

    const items = await all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
    for (const item of items) {
      await run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    await run('COMMIT');
    return getOrderById(orderId);
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
}

// Caisse : Commandes en attente d'encaissement (filtrées optionnellement par restaurant)
export async function getPendingCaisseOrders(restaurantId) {
  await checkAndExpireOrders();
  let query = `SELECT * FROM orders WHERE statut = 'EN_ATTENTE_DE_PAIEMENT'`;
  const params = [];
  if (restaurantId && restaurantId !== '*') {
    query += ` AND restaurant_id = ?`;
    params.push(restaurantId);
  }
  query += ` ORDER BY created_at DESC`;

  const rows = await all(query, params);
  const results = [];
  for (const row of rows) {
    const items = await all('SELECT * FROM order_items WHERE order_id = ?', [row.id]);
    results.push(formatOrder(row, items));
  }
  return results;
}

// Caisse : Validation de l'encaissement Orange Money
export async function validateOrderCaisse(orderId) {
  await checkAndExpireOrders();
  const orderRow = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!orderRow) throw new Error('Commande non trouvée');

  if (orderRow.statut !== 'EN_ATTENTE_DE_PAIEMENT') {
    throw new Error(`La commande a déjà le statut ${orderRow.statut}`);
  }

  const now = new Date().toISOString();
  await run(
    `UPDATE orders SET statut = 'EN_PREPARATION', paid_at = ? WHERE id = ?`,
    [now, orderId]
  );

  return getOrderById(orderId);
}

// Cuisine : Commandes payées en cours de préparation (KDS, filtrées optionnellement par restaurant)
export async function getActiveCuisineOrders(restaurantId) {
  let query = `SELECT * FROM orders WHERE statut IN ('EN_PREPARATION', 'PAYEE')`;
  const params = [];
  if (restaurantId && restaurantId !== '*') {
    query += ` AND restaurant_id = ?`;
    params.push(restaurantId);
  }
  query += ` ORDER BY created_at ASC`;

  const rows = await all(query, params);
  const results = [];
  for (const row of rows) {
    const items = await all('SELECT * FROM order_items WHERE order_id = ?', [row.id]);
    results.push(formatOrder(row, items));
  }
  return results;
}

// Cuisine : Marquer prête à servir
export async function finishOrderCuisine(orderId) {
  const orderRow = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!orderRow) throw new Error('Commande non trouvée');

  if (orderRow.statut !== 'EN_PREPARATION' && orderRow.statut !== 'PAYEE') {
    throw new Error(`Statut invalide pour finalisation: ${orderRow.statut}`);
  }

  const now = new Date().toISOString();
  await run(
    `UPDATE orders SET statut = 'PRETE', ready_at = ? WHERE id = ?`,
    [now, orderId]
  );

  return getOrderById(orderId);
}

// Mise à jour du mode de paiement pour une commande en attente
export async function updateOrderPaymentMethod(orderId, modePaiement) {
  const allowed = ['orange_money', 'moov_money', 'wave'];
  if (!allowed.includes(modePaiement)) {
    throw new Error(`Mode de paiement non supporté : ${modePaiement}`);
  }

  const order = await get('SELECT id, statut FROM orders WHERE id = ?', [orderId]);
  if (!order) throw new Error('Commande non trouvée');
  if (order.statut !== 'EN_ATTENTE_DE_PAIEMENT') {
    throw new Error('Impossible de modifier le moyen de paiement pour cette commande');
  }

  await run(`UPDATE orders SET mode_paiement = ? WHERE id = ?`, [modePaiement, orderId]);
  return getOrderById(orderId);
}

export default {
  initDb,
  getAllRestaurants,
  getRestaurantByIdOrSlug,
  createRestaurant,
  updateRestaurant,
  getPlatformStats,
  getAllProducts,
  getProductById,
  getStaffByPin,
  createOrderTransaction,
  checkAndExpireOrders,
  getOrderById,
  cancelOrderClient,
  updateOrderPaymentMethod,
  getPendingCaisseOrders,
  validateOrderCaisse,
  getActiveCuisineOrders,
  finishOrderCuisine,
  run,
  get,
  all
};


