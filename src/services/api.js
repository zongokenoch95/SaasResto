// Centralisation des appels API REST pour RestoPremium

export function getProducts() {
  return fetch('/api/products').then(r => r.json());
}

export function getProductById(id) {
  return fetch(`/api/products/${id}`).then(r => r.json());
}

// 1. Client : Création de la commande avec réservation de stock
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

// 2. Client : Polling statut (toutes les 3 secondes)
export function getCommandeStatut(orderId) {
  return fetch(`/api/commandes/${orderId}/statut`).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Commande introuvable");
    return data;
  });
}

// 3. Client : Annulation avant paiement
export function cancelCommandeClient(orderId) {
  return fetch(`/api/commandes/${orderId}/annuler-client`, {
    method: 'POST'
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Impossible d'annuler la commande");
    return data;
  });
}

// 4. Caisse : Commandes en attente d'encaissement
export function getCaisseCommandesEnAttente() {
  return fetch('/api/caisse/commandes/en-attente').then(r => r.json());
}

// 5. Caisse : Validation de l'encaissement (après Max it)
export function validerEncaissement(orderId) {
  return fetch(`/api/caisse/commandes/${orderId}/valider`, {
    method: 'POST'
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur lors de la validation");
    return data;
  });
}

// 6. Cuisine : Commandes payées en cours de préparation (KDS)
export function getCuisineCommandesActives() {
  return fetch('/api/cuisine/commandes-actives').then(r => r.json());
}

// 7. Cuisine : Finalisation de la commande (Prête à servir)
export function terminerCommandeCuisine(orderId) {
  return fetch(`/api/cuisine/commandes/${orderId}/terminer`, {
    method: 'POST'
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur lors de la finalisation");
    return data;
  });
}
