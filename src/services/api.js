// Centralisation des appels API REST pour RestoPremium

function getAuthHeaders() {
  const token = localStorage.getItem('resto_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ------------------------------------------------------------------
// Authentification Personnel Restaurant
// ------------------------------------------------------------------
export function loginRestaurant(pin, restaurantId) {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, restaurantId })
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Code PIN incorrect");
    return data;
  });
}

export function getAuthMe() {
  return fetch('/api/auth/me', {
    headers: { ...getAuthHeaders() }
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Non authentifié");
    return data;
  });
}

export function logoutRestaurant() {
  return fetch('/api/auth/logout', {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  }).then(r => r.json());
}

// ------------------------------------------------------------------
// Catalogue Produits (Public)
// ------------------------------------------------------------------
export function getProducts(restaurantId) {
  const url = restaurantId ? `/api/products?restaurantId=${encodeURIComponent(restaurantId)}` : '/api/products';
  return fetch(url).then(r => r.json());
}

export function getProductById(id) {
  return fetch(`/api/products/${id}`).then(r => r.json());
}

// ------------------------------------------------------------------
// Client : Module Commande & Paiement (Public)
// ------------------------------------------------------------------
export function createCommande(orderData) {
  return fetch('/api/commandes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur lors de la création de la commande");
    return data;
  });
}

// Alias de rétrocompatibilité
export const createOrder = createCommande;

export function getCommandeStatut(orderId) {
  return fetch(`/api/commandes/${orderId}/statut`).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Commande introuvable");
    return data;
  });
}

export function cancelCommandeClient(orderId) {
  return fetch(`/api/commandes/${orderId}/annuler-client`, {
    method: 'POST'
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Impossible d'annuler la commande");
    return data;
  });
}

export function updateCommandePaymentMethod(orderId, modePaiement) {
  return fetch(`/api/commandes/${orderId}/mode-paiement`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modePaiement })
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur changement mode paiement");
    return data;
  });
}

// ------------------------------------------------------------------
// Caisse : Gestion des encaissements (Protégé: Caisse, Admin)
// ------------------------------------------------------------------
export function getCaisseCommandesEnAttente() {
  return fetch('/api/caisse/commandes/en-attente', {
    headers: { ...getAuthHeaders() }
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur de chargement caisse");
    return data;
  });
}

export function validerEncaissement(orderId) {
  return fetch(`/api/caisse/commandes/${orderId}/valider`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur lors de la validation");
    return data;
  });
}

// ------------------------------------------------------------------
// Cuisine : KDS - Kitchen Display System (Protégé: Cuisine, Caisse, Admin)
// ------------------------------------------------------------------
export function getCuisineCommandesActives() {
  return fetch('/api/cuisine/commandes-actives', {
    headers: { ...getAuthHeaders() }
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur de chargement cuisine");
    return data;
  });
}

export function terminerCommandeCuisine(orderId) {
  return fetch(`/api/cuisine/commandes/${orderId}/terminer`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur lors de la finalisation");
    return data;
  });
}

// ------------------------------------------------------------------
// Gestion des Restaurants & SuperAdmin (Multi-Tenant)
// ------------------------------------------------------------------
export function getRestaurants() {
  return fetch('/api/restaurants').then(r => r.json());
}

export function getRestaurantByIdOrSlug(idOrSlug) {
  return fetch(`/api/restaurants/${idOrSlug}`).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Restaurant non trouvé");
    return data;
  });
}

export function createRestaurant(restaurantData) {
  return fetch('/api/restaurants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(restaurantData)
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur création restaurant");
    return data;
  });
}

export function updateRestaurant(id, restaurantData) {
  return fetch(`/api/restaurants/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(restaurantData)
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur modification restaurant");
    return data;
  });
}

export function getSuperAdminStats() {
  return fetch('/api/superadmin/stats', {
    headers: { ...getAuthHeaders() }
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur chargement statistiques");
    return data;
  });
}

