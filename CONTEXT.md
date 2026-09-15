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


# Diagnostic & Implémentation : Validation Automatique des Paiements (Orange Money / MacroDroid Bridge)

## 1. Statut de l'Implémentation
✅ **Implémenté et testé (33/33 tests CI/CD validés)** sur la branche `feature/webhook-payment-bridge`.

## 2. Endpoints Webhook Disponibles

| Méthode | URL | Description | Sécurité |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/webhooks/orange-money/:restaurantId` | Validation multi-tenant (ex: `/resto-premium-01` ou `/le-braise-02`) | Header `x-webhook-secret: resto_secret_2026` |
| `POST` | `/api/webhooks/orange-money-notification` | Route universelle (restaurant par défaut ou via paramètre) | Header `x-webhook-secret: resto_secret_2026` |

---

## 3. Configuration Exacte de MacroDroid (Smartphone Android Caisse)

### A. Déclencheur (Trigger)
1. **Ajouter un Déclencheur** ➔ **Messages** ➔ **SMS Reçu**.
2. Sélectionner **N'importe quel contenu** (ou filtrer par contenu contenant `recu` ou `reçu`).
3. Expéditeur : `OrangeMoney` ou `144` (ou `N'importe quel numéro` pour les tests).

### B. Action (Action HTTP Request)
1. **Ajouter une Action** ➔ **Connectivité** ➔ **Requête HTTP**.
2. **Méthode :** `POST`
3. **URL :**
   - *Via Dev Tunnel VS Code :*  
     `https://1czbbcwk-3000.uks1.devtunnels.ms/api/webhooks/orange-money/resto-premium-01`
   - *En réseau local Wi-Fi direct (si sur le même réseau) :*  
     `http://192.168.1.X:3000/api/webhooks/orange-money/resto-premium-01`
4. **En-têtes HTTP (Headers) :**
   - `Content-Type`: `application/json`
   - `x-webhook-secret`: `resto_secret_2026`
5. **Corps du contenu (Body / Text Content) :**
   ```json
   {
     "message": "[sms_body]",
     "sender": "[sms_number]"
   }
   ```
   *(Dans MacroDroid, cliquez sur les trois petits points ou le bouton `[...]` pour insérer les tags magiques `[sms_body]` et `[sms_number]`)*.

---

## 4. Configuration Obligatoire du Tunnel VS Code (Point Bloquant Résolu)

Si vous utilisez **VS Code Dev Tunnels** pour exposer le port 3000 vers Internet :
1. Ouvrez l'onglet **Ports** dans VS Code (en bas à côté du Terminal).
2. Repérez la ligne du port `3000`.
3. Faites **Clic droit** sur la ligne ➔ **Port Visibility** (Visibilité du Port) ➔ Sélectionnez **Public**.
> [!IMPORTANT]
> Par défaut, VS Code règle les ports sur **Private**, ce qui bloque les requêtes de MacroDroid avec une erreur `401 Unauthorized` ou une redirection HTML vers Microsoft Login. Passer en **Public** permet à MacroDroid d'atteindre le serveur directement.

---

## 5. Test Manuel Rapide (Depuis Terminal ou Postman)

Pour simuler instantanément un SMS Orange Money reçu :
```bash
curl -X POST http://localhost:3000/api/webhooks/orange-money/resto-premium-01 \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: resto_secret_2026" \
  -d '{"message": "Vous avez recu 3500 FCFA de 70123456. Trans ID: CI240915.1234. Nouveau solde 50000 FCFA."}'
```
*Le serveur valide automatiquement la commande en attente de 3500 FCFA et émet un événement Socket.io pour basculer instantanément l'écran du client et de la cuisine.*