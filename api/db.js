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

  // 1. Table Produits
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      image TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Table Commandes
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
      statut TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      paid_at DATETIME,
      ready_at DATETIME,
      cancelled_at DATETIME
    )
  `);

  // 3. Table Articles de Commande
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

  // 4. Table Personnel (Staff)
  await run(`
    CREATE TABLE IF NOT EXISTS staff_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin TEXT NOT NULL
    )
  `);

  // Seeding Produits si table vide
  const productCount = await get('SELECT COUNT(*) as count FROM products');
  if (productCount.count === 0 && fs.existsSync(productsJsonPath)) {
    try {
      const initialProducts = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8') || '[]');
      for (const p of initialProducts) {
        await run(
          `INSERT INTO products (id, name, category, price, description, image, stock)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.name, p.category, p.price, p.description || '', p.image || '', Number(p.stock) || 25]
        );
      }
      console.log(`📦 Seeding initial : ${initialProducts.length} produits importés dans SQLite.`);
    } catch (err) {
      console.error('Erreur lors du seeding des produits:', err);
    }
  }

  // Seeding Utilisateurs Staff si table vide
  const staffCount = await get('SELECT COUNT(*) as count FROM staff_users');
  if (staffCount.count === 0) {
    await run(`INSERT INTO staff_users (id, name, role, pin) VALUES ('caisse-01', 'Caisse Principale', 'caisse', '1234')`);
    await run(`INSERT INTO staff_users (id, name, role, pin) VALUES ('cuisine-01', 'Chef de Cuisine', 'cuisine', '5678')`);
    await run(`INSERT INTO staff_users (id, name, role, pin) VALUES ('admin-01', 'Gérant du Restaurant', 'admin', '0000')`);
    console.log(`👥 Seeding initial : 3 comptes staff créés dans SQLite.`);
  }

  console.log('✅ Base de données SQLite connectée et prête.');
}

// ==========================================
// MÉTIER : CATALOGUE PRODUITS
// ==========================================
export async function getAllProducts() {
  return all('SELECT id, name, category, price, description, image, stock FROM products ORDER BY id ASC');
}

export async function getProductById(id) {
  return get('SELECT id, name, category, price, description, image, stock FROM products WHERE id = ?', [id]);
}

// ==========================================
// MÉTIER : AUTHENTIFICATION STAFF
// ==========================================
export async function getStaffByPin(pin) {
  return get('SELECT id, name, role, pin FROM staff_users WHERE pin = ?', [String(pin).trim()]);
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
    } catch (err) {
      await run('ROLLBACK');
      console.error(`Erreur expiration commande ${exp.id}:`, err);
    }
  }
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
    items = [],
    montantTotal = 0,
    total = 0
  } = orderData;

  const finalPhone = numeroClient || customerPhone || '';
  const finalTotal = Number(montantTotal || total || 0);

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

    // 3. Insertion de la commande
    await run(
      `INSERT INTO orders (id, restaurant_id, customer_name, numero_client, customer_phone, table_number, special_notes, montant_total, statut, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EN_ATTENTE_DE_PAIEMENT', ?, ?)`,
      [orderId, restaurantId, customerName, finalPhone, finalPhone, Number(tableNumber) || 1, specialNotes, finalTotal, now.toISOString(), expiresAt]
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

// Caisse : Commandes en attente d'encaissement
export async function getPendingCaisseOrders() {
  await checkAndExpireOrders();
  const rows = await all(
    `SELECT * FROM orders WHERE statut = 'EN_ATTENTE_DE_PAIEMENT' ORDER BY created_at DESC`
  );

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

// Cuisine : Commandes payées en cours de préparation (KDS)
export async function getActiveCuisineOrders() {
  const rows = await all(
    `SELECT * FROM orders WHERE statut IN ('EN_PREPARATION', 'PAYEE') ORDER BY created_at ASC`
  );

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

export default {
  initDb,
  getAllProducts,
  getProductById,
  getStaffByPin,
  createOrderTransaction,
  checkAndExpireOrders,
  getOrderById,
  cancelOrderClient,
  getPendingCaisseOrders,
  validateOrderCaisse,
  getActiveCuisineOrders,
  finishOrderCuisine
};

