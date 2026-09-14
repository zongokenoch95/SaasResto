import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import db from './db.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

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

    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role) && session.role !== 'admin') {
      return res.status(403).json({ error: `Rôle insuffisant (${session.role}). Action réservée aux rôles : ${allowedRoles.join(', ')}` });
    }

    req.user = session;
    next();
  };
}

// ==========================================
// 1. CATALOGUE PRODUITS (SQLITE)
// ==========================================

// GET /api/products : Récupérer tous les produits (avec stock en temps réel)
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.getAllProducts();
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
    res.json({ success: true, message: "Commande annulée et stock libéré", order, commande: order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 3. AUTHENTIFICATION DU PERSONNEL (RESTAURANT)
// ==========================================

// POST /api/auth/login : Connexion avec code PIN (Requête sur staff_users)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "Code PIN requis" });
    }

    const account = await db.getStaffByPin(pin);
    if (!account) {
      return res.status(401).json({ error: "Code PIN incorrect" });
    }

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
    const pending = await db.getPendingCaisseOrders();
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: "Erreur caisse: " + err.message });
  }
});

// POST /api/caisse/commandes/:id/valider : Validation manuelle de l'encaissement (Protégé: caisse, admin)
app.post('/api/caisse/commandes/:id/valider', requireAuth(['caisse', 'admin']), async (req, res) => {
  try {
    const order = await db.validateOrderCaisse(req.params.id);
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
    const activeOrders = await db.getActiveCuisineOrders();
    res.json(activeOrders);
  } catch (err) {
    res.status(500).json({ error: "Erreur cuisine: " + err.message });
  }
});

// POST /api/cuisine/commandes/:id/terminer : Marquer la commande comme prête à servir (Protégé: cuisine, caisse, admin)
app.post('/api/cuisine/commandes/:id/terminer', requireAuth(['cuisine', 'caisse', 'admin']), async (req, res) => {
  try {
    const order = await db.finishOrderCuisine(req.params.id);
    res.json({ success: true, message: "Commande prête à servir", order, commande: order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur backend RestoPremium démarré sur http://localhost:${PORT}`);
});
