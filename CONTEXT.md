# Contexte Projet : Module Commande & Encaissement Restaurant (No-Aggregator)

## 1. Objectif
Faire évoluer le projet existant (auparavant limité à une simple confirmation de commande sans paiement) vers un flux complet intégrant :
- Paiement direct sans agrégateur via Orange Money Burkina (USSD marchand `*144*4*6*...#`).
- Vérification du paiement via polling (3 secondes) et gestion des stocks avec verrouillage temporaire (TTL 10 min).
- Dashboard combiné pour le restaurant : Caisse (validation manuelle/automatique des encaissements) et Cuisine (KDS - Kitchen Display System).

## 2. Spécifications du Flux Commande & Paiement
1. **Création Commande :** Dès que le client clique sur "Commander", la commande est enregistrée avec le statut `EN_ATTENTE_DE_PAIEMENT`, et un compte à rebours de 10 minutes s'enclenche.
2. **Déclenchement Paiement :**
   - **Mobile :** Bouton ouvrant l'URL `tel:*144*4*6*CODE_MARCHAND*MONTANT%23` pour pré-remplir le composeur d'appels natif.
   - **Desktop :** QR Code dynamique encodant ce même schéma `tel:`.
3. **Attente Active & Polling :**
   - Le client revient sur la page web.
   - Le frontend interroge l'endpoint `GET /api/commandes/:id/statut` toutes les 3 secondes.
   - Le client peut annuler la commande tant qu'elle n'est pas payée (libération immédiate des stocks réservés).
4. **Validation Restaurant :**
   - L'écran caisse affiche les commandes `EN_ATTENTE_DE_PAIEMENT` en alerte visuelle et sonore.
   - Le caissier vérifie la réception des fonds sur son application Max it et clique sur "Valider l'encaissement" (`POST /api/caisse/commandes/:id/valider`).
   - Le statut passe à `PAYEE` puis `EN_PREPARATION`.
   - Le polling client détecte le changement et affiche l'écran vert de confirmation.
   - Le ticket bascule immédiatement dans la colonne "Cuisine" du dashboard.

## 3. Données & Endpoints Requis
- **Champs Commande :** `id`, `restaurantId`, `montantTotal`, `numeroClient`, `statut` ('EN_ATTENTE_DE_PAIEMENT', 'PAYEE', 'EN_PREPARATION', 'PRETE', 'ANNULEE_EXPIREE', 'ANNULEE_PAR_CLIENT'), `expiresAt`.
- **Routes API :**
  - `POST /api/commandes` : Création + réservation stock.
  - `GET /api/commandes/:id/statut` : Polling statut pour le client.
  - `POST /api/commandes/:id/annuler-client` : Annulation avant paiement.
  - `GET /api/caisse/commandes/en-attente` : Commandes à encaisser.
  - `POST /api/caisse/commandes/:id/valider` : Validation de l'encaissement.
  - `GET /api/cuisine/commandes-actives` : Commandes payées en cours de cuisson.
  - `POST /api/cuisine/commandes/:id/terminer` : Commande prête à servir.