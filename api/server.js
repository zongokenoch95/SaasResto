import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const productsFilePath = path.join(__dirname, 'products.json');
const ordersFilePath = path.join(__dirname, 'orders.json');

// ==========================================
// CONFIGURATION AUTHENTIFICATION & SESSIONS
// ==========================================
const STAFF_ACCOUNTS = [
  { id: 'caisse-01', pin: '1234', role: 'caisse', name: 'Caisse Principale' },
  { id: 'cuisine-01', pin: '5678', role: 'cuisine', name: 'Chef de Cuisine' },
  { id: 'admin-01', pin: '0000', role: 'admin', name: 'Gérant du Restaurant' }
];

// Sessions actives en mémoire : token -> { id, role, name, expiresAt }
const activeSessions = new Map();

// Nettoyage périodique des sessions expirées (durée de validité : 12 heures)
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt && now > session.expiresAt) {
      activeSessions.delete(token);
    }
  }
}

// Middleware de vérification d'authentification
function requireAuth(allowedRoles = []) {
  return (req, res, next) => {
    cleanExpiredSessions();
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Accès non autorisé : Token manquant' });
    }

    const token = authHeader.slice(7).trim();
    const session = activeSessions.get(token);

    if (!session) {
      return res.status(401).json({ error: 'Session expirée ou invalide. Veuillez vous reconnecter.' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role) && session.role !== 'admin') {
      return res.status(403).json({ error: `Rôle insuffisant (${session.role}). Action réservée aux rôles : ${allowedRoles.join(', ')}` });
    }

    req.user = session;
    next();
  };
}

// Fonctions utilitaires d'accès aux fichiers
function readJson(file) {
  try {
    if (!fs.existsSync(file)) return [];
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Erreur lecture ${file}:`, err);
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Restitution des stocks lors d'une annulation ou expiration
function restoreOrderStock(order, products) {
  if (!order.items || !Array.isArray(order.items)) return false;
  let changed = false;
  for (const item of order.items) {
    const prodId = item.id || (item.product && item.product.id);
    const qty = Number(item.quantity) || 1;
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      prod.stock = (Number(prod.stock) || 0) + qty;
      changed = true;
    }
  }
  return changed;
}

// Vérification et bascule automatique des commandes expirées (TTL 10 min)
function checkAndExpireOrders(orders, products) {
  const now = Date.now();
  let ordersChanged = false;
  let productsChanged = false;

  for (const order of orders) {
    if (order.statut === 'EN_ATTENTE_DE_PAIEMENT' && order.expiresAt) {
      const expTime = new Date(order.expiresAt).getTime();
      if (now > expTime) {
        order.statut = 'ANNULEE_EXPIREE';
        order.expiredAt = new Date().toISOString();
        if (restoreOrderStock(order, products)) {
          productsChanged = true;
        }
        ordersChanged = true;
      }
    }
  }

  if (productsChanged) writeJson(productsFilePath, products);
  if (ordersChanged) writeJson(ordersFilePath, orders);

  return { ordersChanged, productsChanged };
}

// ==========================================
// 1. CATALOGUE PRODUITS
// ==========================================

// GET /api/products : Récupérer tous les produits (avec stock à jour)
app.get('/api/products', (req, res) => {
  const products = readJson(productsFilePath);
  res.json(products);
});

// GET /api/products/:id : Récupérer un produit
app.get('/api/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const products = readJson(productsFilePath);
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: "Produit non trouvé" });
  res.json(product);
});

// ==========================================
// 2. MODULE COMMANDE & PAIEMENT (CLIENT)
// ==========================================

// POST /api/commandes : Création de commande avec verrouillage temporaire de stock (TTL 10 min)
app.post(['/api/commandes', '/api/orders'], (req, res) => {
  const { 
    restaurantId = "resto-premium-01", 
    customerName = "Client", 
    numeroClient, 
    customerPhone, 
    tableNumber = 1, 
    specialNotes = "", 
    items = [], 
    montantTotal, 
    total 
  } = req.body;

  const finalPhone = numeroClient || customerPhone || "";
  const finalTotal = Number(montantTotal || total || 0);

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Le panier est vide" });
  }

  const products = readJson(productsFilePath);
  const orders = readJson(ordersFilePath);

  // 1. Vérification de la disponibilité du stock
  for (const item of items) {
    const prodId = item.id || (item.product && item.product.id);
    const qty = Number(item.quantity) || 1;
    const prod = products.find(p => p.id === prodId);

    if (!prod) {
      return res.status(400).json({ error: `Produit introuvable (ID ${prodId})` });
    }
    if ((Number(prod.stock) || 0) < qty) {
      return res.status(400).json({ error: `Stock insuffisant pour ${prod.name} (Restant: ${prod.stock})` });
    }
  }

  // 2. Décrémentation temporaire du stock
  for (const item of items) {
    const prodId = item.id || (item.product && item.product.id);
    const qty = Number(item.quantity) || 1;
    const prod = products.find(p => p.id === prodId);
    prod.stock = (Number(prod.stock) || 0) - qty;
  }
  writeJson(productsFilePath, products);

  // 3. Création de la commande avec TTL de 10 minutes
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const orderId = `CMD-${Date.now()}`;

  const newOrder = {
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

  orders.push(newOrder);
  writeJson(ordersFilePath, orders);

  res.status(201).json(newOrder);
});

// GET /api/commandes/:id/statut : Polling statut pour le client (toutes les 3s)
app.get('/api/commandes/:id/statut', (req, res) => {
  const orderId = req.params.id;
  const products = readJson(productsFilePath);
  const orders = readJson(ordersFilePath);

  checkAndExpireOrders(orders, products);

  const order = orders.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) {
    return res.status(404).json({ error: "Commande non trouvée" });
  }

  const remainingSeconds = order.expiresAt ? Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - Date.now()) / 1000)) : 0;

  res.json({
    id: order.id,
    orderId: order.id,
    statut: order.statut,
    status: order.statut,
    expiresAt: order.expiresAt,
    tempsRestantSecondes: remainingSeconds,
    remainingSeconds: remainingSeconds,
    montantTotal: order.montantTotal,
    customerName: order.customerName,
    tableNumber: order.tableNumber,
    numeroClient: order.numeroClient,
    items: order.items,
    order: order,
    commande: order
  });
});

// POST /api/commandes/:id/annuler-client : Annulation avant paiement par le client
app.post('/api/commandes/:id/annuler-client', (req, res) => {
  const orderId = req.params.id;
  const products = readJson(productsFilePath);
  const orders = readJson(ordersFilePath);

  const order = orders.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) return res.status(404).json({ error: "Commande non trouvée" });

  if (order.statut !== 'EN_ATTENTE_DE_PAIEMENT') {
    return res.status(400).json({ error: "Impossible d'annuler une commande déjà payée ou expirée" });
  }

  order.statut = 'ANNULEE_PAR_CLIENT';
  order.status = 'ANNULEE_PAR_CLIENT';
  order.cancelledAt = new Date().toISOString();

  // Restitution immédiate des stocks réservés
  restoreOrderStock(order, products);

  writeJson(productsFilePath, products);
  writeJson(ordersFilePath, orders);

  res.json({ success: true, message: "Commande annulée et stock libéré", order, commande: order });
});

// ==========================================
// 3. AUTHENTIFICATION DU PERSONNEL (RESTAURANT)
// ==========================================

// POST /api/auth/login : Connexion avec code PIN
app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: "Code PIN requis" });
  }

  const account = STAFF_ACCOUNTS.find(a => a.pin === String(pin).trim());
  if (!account) {
    return res.status(401).json({ error: "Code PIN incorrect" });
  }

  // Génération d'un token sécurisé
  const token = `resto_${crypto.randomBytes(24).toString('hex')}`;
  const expiresAt = Date.now() + SESSION_TTL_MS;

  const sessionData = {
    id: account.id,
    role: account.role,
    name: account.name,
    expiresAt
  };

  activeSessions.set(token, sessionData);

  res.json({
    success: true,
    token,
    user: {
      id: account.id,
      role: account.role,
      name: account.name
    }
  });
});

// GET /api/auth/me : Vérification du token actif
app.get('/api/auth/me', requireAuth(), (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      role: req.user.role,
      name: req.user.name
    }
  });
});

// POST /api/auth/logout : Déconnexion
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    activeSessions.delete(token);
  }
  res.json({ success: true, message: "Déconnexion réussie" });
});

// ==========================================
// 4. DASHBOARD CAISSE (RESTAURANT)
// ==========================================

// GET /api/caisse/commandes/en-attente : Liste des commandes en attente d'encaissement (Protégé: caisse, admin)
app.get('/api/caisse/commandes/en-attente', requireAuth(['caisse', 'admin']), (req, res) => {
  const products = readJson(productsFilePath);
  const orders = readJson(ordersFilePath);

  checkAndExpireOrders(orders, products);

  const pending = orders.filter(o => o.statut === 'EN_ATTENTE_DE_PAIEMENT');
  res.json(pending);
});

// POST /api/caisse/commandes/:id/valider : Validation manuelle de l'encaissement (Protégé: caisse, admin)
app.post('/api/caisse/commandes/:id/valider', requireAuth(['caisse', 'admin']), (req, res) => {
  const orderId = req.params.id;
  const products = readJson(productsFilePath);
  const orders = readJson(ordersFilePath);

  checkAndExpireOrders(orders, products);

  const order = orders.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) return res.status(404).json({ error: "Commande non trouvée" });

  if (order.statut !== 'EN_ATTENTE_DE_PAIEMENT') {
    return res.status(400).json({ error: `La commande a déjà le statut ${order.statut}` });
  }

  // Le statut passe à PAYEE puis bascule immédiatement en cuisine (EN_PREPARATION)
  order.statut = 'EN_PREPARATION';
  order.status = 'EN_PREPARATION';
  order.isPaid = true;
  order.paidAt = new Date().toISOString();

  writeJson(ordersFilePath, orders);

  res.json({ success: true, message: "Encaissement validé avec succès", order, commande: order });
});

// ==========================================
// 5. DASHBOARD CUISINE (KDS - KITCHEN DISPLAY)
// ==========================================

// GET /api/cuisine/commandes-actives : Commandes payées en cours de préparation (Protégé: cuisine, caisse, admin)
app.get('/api/cuisine/commandes-actives', requireAuth(['cuisine', 'caisse', 'admin']), (req, res) => {
  const orders = readJson(ordersFilePath);
  const activeOrders = orders.filter(o => o.statut === 'EN_PREPARATION' || o.statut === 'PAYEE');
  res.json(activeOrders);
});

// POST /api/cuisine/commandes/:id/terminer : Marquer la commande comme prête à servir (Protégé: cuisine, caisse, admin)
app.post('/api/cuisine/commandes/:id/terminer', requireAuth(['cuisine', 'caisse', 'admin']), (req, res) => {
  const orderId = req.params.id;
  const orders = readJson(ordersFilePath);

  const order = orders.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) return res.status(404).json({ error: "Commande non trouvée" });

  if (order.statut !== 'EN_PREPARATION' && order.statut !== 'PAYEE') {
    return res.status(400).json({ error: `Statut invalide pour finalisation: ${order.statut}` });
  }

  order.statut = 'PRETE';
  order.status = 'PRETE';
  order.readyAt = new Date().toISOString();

  writeJson(ordersFilePath, orders);

  res.json({ success: true, message: "Commande prête à servir", order, commande: order });
});

app.listen(PORT, () => {
  console.log(`✅ Serveur backend RestoPremium démarré sur http://localhost:${PORT}`);
});
