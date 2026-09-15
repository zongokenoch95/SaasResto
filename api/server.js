import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import http from 'http';
import { Server } from 'socket.io';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: ['text/*', 'application/text'] }));

// ==========================================
// GESTION TEMPS RÉEL (SOCKET.IO)
// ==========================================
io.on('connection', (socket) => {
  // Client écoute sa commande spécifique
  socket.on('join:order', (orderId) => {
    if (orderId) {
      socket.join(`order:${orderId}`);
    }
  });

  socket.on('leave:order', (orderId) => {
    if (orderId) {
      socket.leave(`order:${orderId}`);
    }
  });

  // Personnel restaurant écoute son rôle (caisse, cuisine, admin)
  socket.on('join:staff', (role) => {
    if (['caisse', 'cuisine', 'admin'].includes(role)) {
      socket.join(`staff:${role}`);
    }
  });
});

export function emitOrderCreated(order) {
  io.to('staff:caisse').to('staff:admin').emit('order:created', order);
  io.emit('order:new', order);
}

export function emitPaymentMethodUpdated(order) {
  io.to(`order:${order.id}`).emit('order:payment_updated', order);
  io.to('staff:caisse').to('staff:admin').emit('order:payment_updated', order);
}

export function emitOrderCancelled(order) {
  io.to(`order:${order.id}`).emit('order:status_changed', { orderId: order.id, statut: order.statut, order });
  io.to('staff:caisse').to('staff:admin').emit('order:cancelled', order);
}

export function emitOrderValidated(order) {
  io.to(`order:${order.id}`).emit('order:status_changed', { orderId: order.id, statut: order.statut, order });
  io.to('staff:caisse').to('staff:admin').emit('order:caisse_validated', order);
  io.to('staff:cuisine').to('staff:admin').emit('order:validated', order);
}

export function emitOrderReady(order) {
  io.to(`order:${order.id}`).emit('order:status_changed', { orderId: order.id, statut: order.statut, order });
  io.to('staff:caisse').to('staff:admin').emit('order:ready', order);
  io.to('staff:cuisine').emit('order:cuisine_ready', order);
}

export function emitOrderExpired(orderId) {
  io.to(`order:${orderId}`).emit('order:status_changed', { orderId, statut: 'ANNULEE_EXPIREE' });
  io.to('staff:caisse').to('staff:admin').emit('order:expired', { id: orderId });
}

// Vérification périodique des expirations avec notification temps réel
const expirationInterval = setInterval(async () => {
  try {
    const expiredIds = await db.checkAndExpireOrders();
    if (expiredIds && expiredIds.length > 0) {
      for (const id of expiredIds) {
        emitOrderExpired(id);
      }
    }
  } catch (err) {
    // Silencieux
  }
}, 5000);
expirationInterval.unref();

// Initialisation de la base de données relationnelle SQLite
await db.initDb();

// ==========================================
// CONFIGURATION AUTHENTIFICATION & SESSIONS
// ==========================================
// Sessions actives en mémoire : token -> { id, role, name, expiresAt }
const activeSessions = new Map();
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

    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role) && session.role !== 'admin' && session.role !== 'superadmin') {
      return res.status(403).json({ error: `Rôle insuffisant (${session.role}). Action réservée aux rôles : ${allowedRoles.join(', ')}` });
    }

    req.user = session;
    next();
  };
}

// ==========================================
// 0. GESTION DES RESTAURANTS (MULTI-TENANT) & SUPERADMIN
// ==========================================

// GET /api/restaurants : Liste de tous les restaurants
app.get('/api/restaurants', async (req, res) => {
  try {
    const restaurants = await db.getAllRestaurants();
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération restaurants: " + err.message });
  }
});

// GET /api/restaurants/:idOrSlug : Fiche détaillée d'un restaurant
app.get('/api/restaurants/:idOrSlug', async (req, res) => {
  try {
    const resto = await db.getRestaurantByIdOrSlug(req.params.idOrSlug);
    if (!resto) return res.status(404).json({ error: "Restaurant non trouvé" });
    res.json(resto);
  } catch (err) {
    res.status(500).json({ error: "Erreur lecture restaurant: " + err.message });
  }
});

// POST /api/restaurants : Créer un nouvel établissement
app.post('/api/restaurants', async (req, res) => {
  try {
    const newResto = await db.createRestaurant(req.body);
    res.status(201).json(newResto);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/restaurants/:id : Mettre à jour un établissement
app.patch('/api/restaurants/:id', async (req, res) => {
  try {
    const updated = await db.updateRestaurant(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/superadmin/stats : Statistiques consolidées plateforme SaaS
app.get('/api/superadmin/stats', async (req, res) => {
  try {
    const stats = await db.getPlatformStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Erreur statistiques plateforme: " + err.message });
  }
});

// ==========================================
// 1. CATALOGUE PRODUITS (SQLITE)
// ==========================================

// GET /api/products : Récupérer les produits (filtrables par restaurant)
app.get('/api/products', async (req, res) => {
  try {
    const restaurantId = req.query.restaurantId || req.query.restaurant_id;
    const products = await db.getAllProducts(restaurantId);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération catalogue: " + err.message });
  }
});

// GET /api/products/:id : Récupérer la fiche d'un produit
app.get('/api/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await db.getProductById(productId);
    if (!product) return res.status(404).json({ error: "Produit non trouvé" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération produit: " + err.message });
  }
});

// ==========================================
// 2. MODULE COMMANDE & PAIEMENT CLIENT (TRANSACTIONS ATOMIQUES)
// ==========================================

// POST /api/commandes : Création de commande avec réservation transactionnelle de stock (TTL 10 min)
app.post(['/api/commandes', '/api/orders'], async (req, res) => {
  try {
    const newOrder = await db.createOrderTransaction(req.body);
    emitOrderCreated(newOrder);
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/commandes/:id/statut : Polling statut pour le client (toutes les 3s)
app.get('/api/commandes/:id/statut', async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    const remainingSeconds = order.expiresAt 
      ? Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - Date.now()) / 1000)) 
      : 0;

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
  } catch (err) {
    res.status(500).json({ error: "Erreur lecture statut: " + err.message });
  }
});

// POST /api/commandes/:id/annuler-client : Annulation avant paiement par le client & restitution stock
app.post('/api/commandes/:id/annuler-client', async (req, res) => {
  try {
    const order = await db.cancelOrderClient(req.params.id);
    emitOrderCancelled(order);
    res.json({ success: true, message: "Commande annulée et stock libéré", order, commande: order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/commandes/:id/mode-paiement : Modification du mode de paiement (Orange, Moov, Wave)
app.patch('/api/commandes/:id/mode-paiement', async (req, res) => {
  try {
    const { modePaiement, mode_paiement } = req.body;
    const finalMethod = modePaiement || mode_paiement;
    const order = await db.updateOrderPaymentMethod(req.params.id, finalMethod);
    emitPaymentMethodUpdated(order);
    res.json({ success: true, message: "Mode de paiement mis à jour", order, commande: order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 3. PASSERELLE WEBHOOK PAIEMENT AUTOMATIQUE (ORANGE MONEY / MACRODROID)
// ==========================================

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'resto_secret_2026';

export function verifyWebhookSecret(req) {
  const secretHeader = req.headers['x-webhook-secret'] || req.headers['x-secret-token'];
  const secretQuery = req.query.secret;
  const provided = secretHeader || secretQuery;
  return Boolean(provided && provided === WEBHOOK_SECRET);
}

// Analyse lexicale du SMS Orange Money ou de la notification Max it
export function parsePaymentNotification(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { amount: null, senderPhone: null, transactionRef: null };
  }

  const text = rawText.trim();

  // 1. Extraction du Montant (FCFA, F CFA, XOF, F)
  let amount = null;
  const amountMatch = text.match(/(?:re[cç]u|montant|payer|pay[eé]|somme)?\s*:?\s*([\d\s.,]+)\s*(?:FCFA|F\s*CFA|XOF|F\b)/i);
  if (amountMatch && amountMatch[1]) {
    const cleaned = amountMatch[1].replace(/[\s.,]/g, '').trim();
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // Fallback si la formulation est directe (ex: "500 FCFA")
  if (!amount) {
    const fallbackMatch = text.match(/(\d+[\s\d]*)\s*(?:FCFA|F\s*CFA|XOF|F\b)/i);
    if (fallbackMatch && fallbackMatch[1]) {
      const cleaned = fallbackMatch[1].replace(/\s/g, '');
      const parsed = parseInt(cleaned, 10);
      if (!isNaN(parsed) && parsed > 0) amount = parsed;
    }
  }

  // 2. Extraction du Numéro de Téléphone (8 chiffres burkinabè commençant par 0, 5, 6 ou 7)
  let senderPhone = null;
  const phoneMatch = text.match(/(?:de|du|exp[eé]diteur|client|num[eé]ro)?\s*:?\s*(?:\+?226|00226)?\s*([0-7]\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})/i);
  if (phoneMatch && phoneMatch[1]) {
    senderPhone = phoneMatch[1].replace(/[\s.-]/g, '');
  }

  // 3. Extraction de la Référence de Transaction (Trans ID, Réf, Ref, TxId)
  let transactionRef = null;
  const refMatch = text.match(/(?:Trans(?:\.|\s+)?ID|R[eé]f(?:\.|\s+)?|ID(?:\.|\s+)?Trans(?:action)?|TxId|Transaction\s*(?:N[°o]|ID|Ref)?)\s*:?\s*([A-Za-z0-9_.-]+)/i);
  if (refMatch && refMatch[1]) {
    transactionRef = refMatch[1].trim().replace(/[.,;:]+$/, '');
  }

  return { amount, senderPhone, transactionRef };
}

// Handler commun pour les requêtes webhook entrantes
async function handlePaymentWebhook(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`📥 [Webhook Orange Money - ${timestamp}] Requête reçue :`, {
    path: req.path,
    params: req.params,
    query: req.query,
    hasSecret: Boolean(req.headers['x-webhook-secret'] || req.query.secret),
    body: req.body
  });

  // 1. Vérification de sécurité anti-fraude
  if (!verifyWebhookSecret(req)) {
    console.warn(`⛔ [Webhook Orange Money - ${timestamp}] Rejet : Secret invalide ou manquant`);
    return res.status(401).json({
      success: false,
      error: "Accès non autorisé : jeton secret manquant ou invalide. Renseignez l'en-tête 'x-webhook-secret'."
    });
  }

  try {
    const rawMessage = typeof req.body === 'string'
      ? req.body
      : (req.body?.message || req.body?.sms_body || req.body?.text || req.body?.content || '');

    const explicitSender = req.body?.sender || req.body?.sms_number || req.body?.phone || req.body?.numero;
    const explicitAmount = req.body?.amount || req.body?.montant;
    const explicitRef = req.body?.ref || req.body?.transaction_id || req.body?.txId || req.body?.transactionRef;

    const parsed = parsePaymentNotification(rawMessage);

    const finalAmount = explicitAmount ? parseInt(explicitAmount, 10) : parsed.amount;
    const finalSender = explicitSender ? String(explicitSender).replace(/\D/g, '').slice(-8) : parsed.senderPhone;
    const finalRef = explicitRef || parsed.transactionRef;

    const restaurantId = req.params.restaurantId || req.query.restaurantId || req.query.restaurant_id || req.body?.restaurantId || 'resto-premium-01';

    console.log(`🔍 [Webhook Orange Money] Données réconciliées :`, {
      restaurantId,
      amount: finalAmount,
      senderPhone: finalSender,
      transactionRef: finalRef
    });

    const reconciliation = await db.reconcilePaymentWebhook({
      restaurantId,
      rawMessage,
      senderPhone: finalSender,
      amount: finalAmount,
      transactionRef: finalRef
    });

    if (reconciliation.matched && !reconciliation.duplicate) {
      console.log(`✅ [Webhook Orange Money] Commande ${reconciliation.order.id} validée ! Émission temps réel...`);
      emitOrderValidated(reconciliation.order);
    } else if (reconciliation.duplicate) {
      console.log(`ℹ️ [Webhook Orange Money] Transaction déjà traitée : ${reconciliation.message}`);
    } else {
      console.log(`⚠️ [Webhook Orange Money] Aucune commande correspondante : ${reconciliation.message}`);
    }

    return res.json({
      success: true,
      matched: reconciliation.matched,
      duplicate: reconciliation.duplicate || false,
      matchedBy: reconciliation.matchedBy || null,
      orderId: reconciliation.order ? reconciliation.order.id : null,
      order: reconciliation.order || null,
      parsed: {
        amount: finalAmount,
        senderPhone: finalSender,
        transactionRef: finalRef
      },
      message: reconciliation.message
    });
  } catch (err) {
    console.error("❌ [Webhook Orange Money] Erreur interne :", err);
    return res.status(500).json({
      success: false,
      error: "Erreur lors du traitement du webhook : " + err.message
    });
  }
}

// Routes Webhook (multi-tenant avec restaurantId et route universelle)
app.post([
  '/api/webhooks/orange-money/:restaurantId',
  '/api/webhooks/orange-money-notification',
  '/api/webhooks/orange-money'
], handlePaymentWebhook);

// ==========================================
// 3. AUTHENTIFICATION DU PERSONNEL (RESTAURANT)
// ==========================================

// POST /api/auth/login : Connexion avec code PIN (Requête sur staff_users)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { pin, restaurantId } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "Code PIN requis" });
    }

    const account = await db.getStaffByPin(pin, restaurantId);
    if (!account) {
      return res.status(401).json({ error: "Code PIN incorrect" });
    }

    const token = `resto_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = Date.now() + SESSION_TTL_MS;

    const sessionData = {
      id: account.id,
      restaurantId: account.restaurant_id,
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
        restaurantId: account.restaurant_id,
        role: account.role,
        name: account.name
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur authentification: " + err.message });
  }
});

// GET /api/auth/me : Vérification du token actif
app.get('/api/auth/me', requireAuth(), (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      restaurantId: req.user.restaurantId,
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
// 4. DASHBOARD CAISSE (RESTAURANT - SQLITE)
// ==========================================

// GET /api/caisse/commandes/en-attente : Liste des commandes en attente d'encaissement (Protégé: caisse, admin)
app.get('/api/caisse/commandes/en-attente', requireAuth(['caisse', 'admin']), async (req, res) => {
  try {
    const restaurantId = req.query.restaurantId || req.user.restaurantId;
    const pending = await db.getPendingCaisseOrders(restaurantId);
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: "Erreur caisse: " + err.message });
  }
});

// POST /api/caisse/commandes/:id/valider : Validation manuelle de l'encaissement (Protégé: caisse, admin)
app.post('/api/caisse/commandes/:id/valider', requireAuth(['caisse', 'admin']), async (req, res) => {
  try {
    const order = await db.validateOrderCaisse(req.params.id);
    emitOrderValidated(order);
    res.json({ success: true, message: "Encaissement validé avec succès", order, commande: order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. DASHBOARD CUISINE (KDS - KITCHEN DISPLAY - SQLITE)
// ==========================================

// GET /api/cuisine/commandes-actives : Commandes payées en cours de préparation (Protégé: cuisine, caisse, admin)
app.get('/api/cuisine/commandes-actives', requireAuth(['cuisine', 'caisse', 'admin']), async (req, res) => {
  try {
    const restaurantId = req.query.restaurantId || req.user.restaurantId;
    const activeOrders = await db.getActiveCuisineOrders(restaurantId);
    res.json(activeOrders);
  } catch (err) {
    res.status(500).json({ error: "Erreur cuisine: " + err.message });
  }
});

// POST /api/cuisine/commandes/:id/terminer : Marquer la commande comme prête à servir (Protégé: cuisine, caisse, admin)
app.post('/api/cuisine/commandes/:id/terminer', requireAuth(['cuisine', 'caisse', 'admin']), async (req, res) => {
  try {
    const order = await db.finishOrderCuisine(req.params.id);
    emitOrderReady(order);
    res.json({ success: true, message: "Commande prête à servir", order, commande: order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`✅ Serveur backend RestoPremium démarré sur http://localhost:${PORT}`);
});

export { app, server, io };
