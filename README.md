# 🍽️ RestoPremium (SaasResto) – Le Premium

> **Plateforme Web de Commande sur Table & Encaissement Restaurant (No-Aggregator)**  
> *Haute Gastronomie Sahélienne & Afro-Gourmet*  
> *Architecture :* Frontend réactif en composants avec **Vue.js 3** & **Pinia**, Backend d'encaissement et de gestion de stocks avec **Node.js / Express**.

---

## 📑 Table des Matières

1. [Présentation du Projet & Proposition de Valeur](#1-présentation-du-projet--proposition-de-valeur)
2. [Matrice de Conformité des Livrables & Fonctionnalités](#2-matrice-de-conformité-des-livrables--fonctionnalités)
3. [Démarrage Rapide, Installation & Identifiants de Test](#3-démarrage-rapide-installation--identifiants-de-test)
4. [Guide Utilisateur Complet](#4-guide-utilisateur-complet)
   * [4.1. Parcours Client (De la table au reçu numérique)](#41-parcours-client-de-la-table-au-reçu-numérique)
   * [4.2. Parcours Équipe Restaurant (Dashboard Caisse & Cuisine KDS)](#42-parcours-équipe-restaurant-dashboard-caisse--cuisine-kds)
   * [4.3. Gestion des Stocks Temporaires (TTL 10 min) & Annulations](#43-gestion-des-stocks-temporaires-ttl-10-min--annulations)
5. [Documentation Technique & Architecture](#5-documentation-technique--architecture)
   * [5.1. Stack Technique & Dépendances](#51-stack-technique--dépendances)
   * [5.2. Architecture Globale & Flux de Données](#52-architecture-globale--flux-de-données)
   * [5.3. Arborescence Exhaustive du Projet](#53-arborescence-exhaustive-du-projet)
   * [5.4. Spécification de l'API REST JSON (Backend Express)](#54-spécification-de-lapi-rest-json-backend-express)
   * [5.5. Gestion d’État Centralisée (Stores Pinia)](#55-gestion-détat-centralisée-stores-pinia)
   * [5.6. Système de Design Global (Dark & Gold)](#56-système-de-design-global-dark--gold)
6. [Organisation & Matrice des Responsabilités](#6-organisation--matrice-des-responsabilités)

---

## 1. Présentation du Projet & Proposition de Valeur

**RestoPremium** (SaasResto) est une solution web complète de commande sur table et d'encaissement direct conçue pour moderniser l'expérience en salle d'un restaurant gastronomique.

### Les défis résolus :
1. **Encaissement Direct sans Agrégateur (Zéro Commission Tiers) :**  
   Les passerelles de paiement traditionnelles imposent des délais d'intégration complexes et prélèvent des commissions (2% à 5%). RestoPremium intègre un paiement direct par **USSD Orange Money Burkina Faso** (`*144*4*6*CODE_MARCHAND*MONTANT#`) et QR Code dynamique, avec vérification instantanée par le caissier sur son application officielle (Orange Max it ou téléphone marchand).
2. **Réservation Temporaire des Stocks avec TTL (10 minutes) :**  
   Dès qu'un client passe commande, les portions sont temporairement réservées pour éviter la survente. Si la commande n'est pas validée avant l'expiration du minuteur ou si le client annule, les stocks sont automatiquement et immédiatement réinjectés dans le catalogue.
3. **Dashboard Combiné & Sécurisé pour le Personnel :**  
   Un écran tactile unique accessible via code PIN avec contrôle d'accès basé sur les rôles (RBAC) sépare les prérogatives de la **Caisse** (alertes sonores automatiques Web Audio, validation des encaissements) et de la **Cuisine** (KDS – *Kitchen Display System* pour la préparation en temps réel).

---

## 2. Matrice de Conformité des Livrables & Fonctionnalités

| Livrable / Module | Statut | Réalisation Concrète | Fichiers Cibles |
| :--- | :---: | :--- | :--- |
| **1. Maquettes Graphiques** | ✅ Réalisé | 5 maquettes UI haute résolution pour chaque étape du parcours | Dossier [`Ressources/`](./Ressources/) |
| **2. Composants Modulaires** | ✅ Réalisé | 6 composants Vue 3 autonomes, découplés et réutilisables | `src/components/` (`Navbar.vue`, `Footer.vue`, `ProductCard.vue`, `CategoryFilter.vue`, `CartItem.vue`, `PromoBanner.vue`) |
| **3. Parcours Client (5 Vues)** | ✅ Réalisé | Catalogue, fiches plats, panier, écran USSD/QR, confirmation | `src/views/client/` (`Home.vue`, `Menu.vue`, `ProductDetails.vue`, `Cart.vue`, `PaymentView.vue`, `OrderConfirmation.vue`) |
| **4. Module Restaurant (2 Vues)** | ✅ Réalisé | Écran de connexion tactile par code PIN & Dashboard Caisse / KDS | `src/views/restaurant/` (`LoginView.vue`, `DashboardView.vue`) |
| **5. Gestion d’État Pinia** | ✅ Réalisé | 4 stores centralisés avec persistance `localStorage` et getters calculés | `src/stores/` (`menuStore.js`, `cartStore.js`, `orderStore.js`, `authStore.js`) |
| **6. API REST Express & Sécurité** | ✅ Réalisé | API Node.js complète, gestion de stock avec TTL, sessions sécurisées et middleware RBAC | `api/server.js`, `src/services/api.js` |
| **7. Manuel & Documentation** | ✅ Réalisé | Guide utilisateur pas-à-pas, matrice de tests et conventions Git | Section [4. Guide Utilisateur](#4-guide-utilisateur-complet) & `walkthrough.md` |

---

## 3. Démarrage Rapide, Installation & Identifiants de Test

### Prérequis
* **Node.js** : v18+ ou v22+
* **NPM** : v9+ ou v10+

### 1. Installation des dépendances
```bash
npm install
```

### 2. Démarrer le serveur Backend API (Port 3000)
```bash
npm run server
# ou
node api/server.js
```
*Le terminal confirme :* `✅ Serveur backend RestoPremium démarré sur http://localhost:3000`

### 3. Démarrer le serveur Frontend Vite (Port 5173)
Dans un second terminal :
```bash
npm run dev
```
*L'application est immédiatement accessible sur :* `http://localhost:5173`

---

### 🔑 Identifiants d'Accès Staff (Codes PIN de Test)

L'accès à l'espace restaurant ([`/restaurant`](http://localhost:5173/restaurant)) est protégé par code PIN :

| Profil | Code PIN | Rôle Système | Périmètre d'Accès |
| :--- | :---: | :---: | :--- |
| **Caisse Principale** | **`1234`** | `caisse` | Validation des encaissements Orange Money + Vue KDS Cuisine |
| **Chef de Cuisine** | **`5678`** | `cuisine` | Écran de préparation Cuisine KDS uniquement (Accès Caisse masqué) |
| **Gérant / Administrateur** | **`0000`** | `admin` | Accès complet sans restriction à l'ensemble du système |

Des boutons de raccourcis démo figurent directement sur l'écran de connexion pour faciliter les tests.

### Liens d'accès direct
* 🏠 **Accueil Client :** [http://localhost:5173/](http://localhost:5173/)
* 🍽️ **Carte & Filtrage :** [http://localhost:5173/menu](http://localhost:5173/menu)
* 🛒 **Panier & Prise de Commande :** [http://localhost:5173/cart](http://localhost:5173/cart)
* 🔐 **Connexion Personnel :** [http://localhost:5173/restaurant/login](http://localhost:5173/restaurant/login)
* 📊 **Dashboard Restaurant :** [http://localhost:5173/restaurant](http://localhost:5173/restaurant)

---

## 4. Guide Utilisateur Complet

### 4.1. Parcours Client (De la table au reçu numérique)

```
[ Accueil / ] ➔ [ Menu /menu ] ➔ [ Fiche Plat /product/:id ] ➔ [ Panier /cart ] ➔ [ Paiement /paiement/:id ] ➔ [ Reçu /confirmation/:id ]
```

1. **Accueil (`/`) :** Découverte de l'établissement, plats signatures du Chef et bannières d'événements exclusifs avec modale d'affichage grand format.
2. **Consultation & Filtres (`/menu`) :** Catalogue de 18 spécialités africaines et sahéliennes avec filtrage instantané sans rechargement (*Tous*, *Entrées*, *Plats*, *Desserts*, *Boissons*).
3. **Fiche Détaillée (`/product/:id`) :** Visuel HD, description des ingrédients, sélecteur numérique de portions (`-` et `+`) et ajout immédiat au panier.
4. **Panier & Prise de Commande (`/cart`) :** Récapitulatif modifiable, calcul dynamique du total, formulaire obligatoire (**Nom**, **Numéro de Table** et **Numéro Orange Money**).
5. **Écran de Paiement Orange Money (`/paiement/:id`) :**
   * **Sur Smartphone :** Bouton d'action direct ouvrant l'URL native `tel:*144*4*6*654321*MONTANT%23` pour pré-remplir le composeur d'appels.
   * **Sur Ordinateur / Tablette :** QR Code dynamique généré automatiquement, scannable avec l'appareil photo du smartphone du client.
   * **Minuteur Dégressif :** Compte à rebours de 10 minutes avec indication du temps restant.
   * **Attente active (Polling) :** Le client revient sur la page web. Le navigateur interroge l'API toutes les 3 secondes (`GET /api/commandes/:id/statut`).
   * **Bouton d'annulation :** Le client peut annuler sa commande tant qu'elle n'est pas payée, ce qui débloque instantanément les stocks réservés.
6. **Reçu Numérique de Confirmation (`/confirmation/:id`) :** Dès la validation caisse, le client est redirigé vers son reçu nominatif avec statut de préparation en direct pour sa table.

---

### 4.2. Parcours Équipe Restaurant (Dashboard Caisse & Cuisine KDS)

1. **Authentification Tactile (`/restaurant/login`) :**  
   Le serveur ou cuisinier saisit son code PIN à 4 chiffres sur le pavé numérique virtuel (ou au clavier). L'authentification est instantanée dès le 4ᵉ chiffre.
2. **Module Caisse (Onglet 🟠 Caisse) :**
   * Affiche toutes les commandes avec statut `EN_ATTENTE_DE_PAIEMENT`.
   * **Alerte Sonore Automatique (Web Audio API) :** Dès qu'une nouvelle commande arrive, un carillon retentit automatiquement pour alerter le caissier.
   * Le caissier vérifie la notification de réception sur son application **Orange Max it** ou son téléphone marchand.
   * Le caissier clique sur **« Valider l'encaissement »** (`POST /api/caisse/commandes/:id/valider`).
3. **Bascule Immédiate en Cuisine (Onglet 👨‍🍳 Cuisine - KDS) :**
   * La commande passe au statut `EN_PREPARATION`.
   * L'écran Cuisine affiche la commande avec le numéro de table, le temps écoulé, le détail des plats et les consignes spéciales (ex: *« sans piment »*).
   * Une fois le plateau dressé, le cuisinier clique sur **« Marquer prête à servir »** (`POST /api/cuisine/commandes/:id/terminer`).

---

### 4.3. Gestion des Stocks Temporaires (TTL 10 min) & Annulations

Pour protéger le restaurant contre les ruptures artificielles :
* **Verrouillage à la commande :** Dès la soumission du panier, les stocks sont décrémentés dans le catalogue.
* **Expiration automatique (TTL 10 minutes) :** Si les fonds ne sont pas encaissés dans les 10 minutes, la commande bascule automatiquement en `ANNULEE_EXPIREE` et les stocks sont intégralement restitués.
* **Annulation volontaire du client :** Si le client clique sur "Annuler la commande", le statut devient `ANNULEE_PAR_CLIENT` et les stocks sont remis à disposition immédiatement.

---

## 5. Documentation Technique & Architecture

### 5.1. Stack Technique & Dépendances

* **Frontend Framework :** Vue.js 3.5+ (Composition API, `<script setup>`)
* **State Management :** Pinia 4.0+ (Gestion d'état réactive avec persistance locale)
* **Routage :** Vue Router 4.6+ (Mode WebHistory HTML5 avec Navigation Guards)
* **Outil de Build & Bundler :** Vite 8.2+ (HMR ultra-rapide, compilation en ~600ms)
* **Génération QR Code :** `qrcode` (Rendu canvas / DataURL côté client)
* **Backend REST :** Node.js avec Express 5.2+, CORS, `crypto` natif pour les sessions
* **Persistance :** Fichiers JSON transactionnels (`products.json`, `orders.json`)
* **Audio :** Web Audio API native (Synthèse sonore sans assets externes lourds)

---

### 5.2. Architecture Globale & Flux de Données

```
+---------------------------------------------------------------------------------------+
|                                    NAVIGATEUR CLIENT                                  |
|                                                                                       |
|  [ Vues Client : Home | Menu | ProductDetails | Cart | PaymentView | Confirmation ]   |
|  [ Vues Staff  : LoginView | DashboardView (Caisse & Cuisine KDS) ]                   |
|                                         │                                             |
|                                         ▼                                             |
|  [ Stores Pinia : menuStore | cartStore | orderStore | authStore ]                    |
|                                         │                                             |
|                                         ▼                                             |
|  [ Service HTTP : src/services/api.js (Headers Authorization: Bearer <token>) ]       |
+-----------------------------------------┬---------------------------------------------+
                                          │ Requêtes HTTP REST
                                          ▼
+---------------------------------------------------------------------------------------+
|                         SERVEUR VITE (Port 5173 - Dev Proxy)                          |
|                     Redirige de manière transparente /api/* vers :3000                |
+-----------------------------------------┬---------------------------------------------+
                                          │ Proxy Pass
                                          ▼
+---------------------------------------------------------------------------------------+
|                       SERVEUR BACKEND (Node.js / Express :3000)                       |
|                                                                                       |
|  - Auth & RBAC   : POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout      |
|  - Catalogue     : GET  /api/products, GET /api/products/:id                          |
|  - Commandes     : POST /api/commandes (Réservation stock + TTL 10 min)               |
|  - Polling       : GET  /api/commandes/:id/statut (Auto-purge commandes expirées)     |
|  - Caisse (RBAC) : GET  /api/caisse/commandes/en-attente, POST .../valider            |
|  - Cuisine (RBAC): GET  /api/cuisine/commandes-actives, POST .../terminer             |
+---------------------------------------------------------------------------------------+
```

---

### 5.3. Arborescence Exhaustive du Projet

```
SaasResto/
├── api/
│   ├── orders.json                      # Persistance des commandes et historique
│   ├── products.json                    # Catalogue complet des spécialités et stocks
│   └── server.js                        # Serveur REST Express, gestion TTL et RBAC
├── public/
│   ├── favicon.svg                      # Favicon de l'application
│   └── icons.svg                        # Sprite d'icônes vectorielles SVG
├── Ressources/                          # Maquettes UI et cahier des charges
│   ├── 1.Accueil - Le Premium.png
│   ├── 2.Menu.png
│   ├── 3.Détail du Plat - Le Premium (Updated).png
│   ├── 4.Votre Panier - Le Premium (Updated).png
│   ├── 5.Confirmation - Le Premium (Updated).png
│   └── Cahier des charges mis a jour - Application Restaurant.md
├── src/
│   ├── assets/
│   │   ├── images/                      # Photographies HD des plats et affiches promos
│   │   └── styles/
│   │       └── main.css                 # Charte graphique Dark & Gold et styles globaux
│   ├── components/                      # Composants Vue 3 modulaires
│   │   ├── CartItem.vue                 # Ligne du panier avec ajustement des portions
│   │   ├── CategoryFilter.vue           # Filtres réactifs de catégories de plats
│   │   ├── Footer.vue                   # Pied de page institutionnel
│   │   ├── Navbar.vue                   # Barre de navigation avec badge panier dynamique
│   │   ├── ProductCard.vue              # Carte de plat avec ajout rapide au panier
│   │   └── PromoBanner.vue              # Bannières d'événements avec modale interactive
│   ├── router/
│   │   └── index.js                     # Configuration Vue Router et beforeEach Route Guard
│   ├── services/
│   │   └── api.js                       # Client HTTP avec injection automatique du token Bearer
│   ├── stores/                          # Stores Pinia partagés
│   │   ├── authStore.js                 # Authentification staff, profil, rôle et sessions
│   │   ├── cartStore.js                 # Panier, quantités, totaux et infos client
│   │   ├── menuStore.js                 # Catalogue, plat actif et filtres
│   │   └── orderStore.js                # Création de commande, polling statut et annulation
│   ├── views/
│   │   ├── client/                      # Les 6 vues du parcours client
│   │   │   ├── Cart.vue                 # Panier et formulaire de commande sur table
│   │   │   ├── Home.vue                 # Page d'accueil et vitrine gastronomique
│   │   │   ├── Menu.vue                 # Catalogue complet avec filtrage
│   │   │   ├── OrderConfirmation.vue    # Reçu numérique nominatif après validation
│   │   │   ├── PaymentView.vue          # Écran de paiement USSD Orange Money & QR Code
│   │   │   └── ProductDetails.vue       # Fiche détaillée avec sélecteur de quantité
│   │   └── restaurant/                  # Les 2 vues de l'espace restaurant
│   │       ├── DashboardView.vue        # Dashboard combiné Caisse (Orange Money) & Cuisine (KDS)
│   │       └── LoginView.vue            # Écran d'identification tactile par code PIN
│   ├── App.vue                          # Composant racine avec point de montage <router-view />
│   └── main.js                          # Point d'entrée de l'application (Vue, Pinia, Router)
├── index.html                           # Document HTML racine
├── package.json                         # Scripts et dépendances du projet
├── README.md                            # Documentation centrale et exhaustive
└── vite.config.js                       # Configuration Vite (alias '@' et proxy d'API)
```

---

### 5.4. Spécification de l'API REST JSON (Backend Express)

| Méthode | Endpoint | Accès / Rôles | Description | Corps de Requête | Réponse Attendue |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authentification du personnel par code PIN | `{ "pin": "1234" }` | `{ success: true, token, user: { id, role, name } }` |
| `GET` | `/api/auth/me` | Connecté | Validation de la session active | *Aucun (Bearer Token)* | `{ success: true, user }` |
| `POST` | `/api/auth/logout` | Connecté | Révocation de la session | *Aucun (Bearer Token)* | `{ success: true, message }` |
| `GET` | `/api/products` | Public | Liste des plats avec stocks disponibles à jour | *Aucun* | `[ { id, name, category, price, stock, ... } ]` |
| `GET` | `/api/products/:id` | Public | Fiche détaillée d'un plat par son identifiant | *Aucun* | `{ id, name, price, description, ... }` |
| `POST` | `/api/commandes` | Public | Création de commande avec verrouillage stock (TTL 10 min) | `{ customerName, numeroClient, tableNumber, items, ... }` | `{ id: "CMD-...", statut: "EN_ATTENTE_DE_PAIEMENT", expiresAt, ... }` |
| `GET` | `/api/commandes/:id/statut` | Public | Polling client toutes les 3s (détecte paiement ou expiration) | *Aucun* | `{ id, statut, tempsRestantSecondes, order }` |
| `POST` | `/api/commandes/:id/annuler-client` | Public | Annulation avant paiement par le client & restitution du stock | *Aucun* | `{ success: true, message, order }` |
| `GET` | `/api/caisse/commandes/en-attente` | `caisse`, `admin` | Commandes en attente de validation Orange Money | *Aucun (Bearer Token)* | `[ { id, customerName, tableNumber, montantTotal, ... } ]` |
| `POST` | `/api/caisse/commandes/:id/valider` | `caisse`, `admin` | Validation manuelle de l'encaissement (après Max it) | *Aucun (Bearer Token)* | `{ success: true, order }` (Statut bascule en `EN_PREPARATION`) |
| `GET` | `/api/cuisine/commandes-actives` | `cuisine`, `caisse`, `admin` | Commandes payées en cours de cuisson (KDS) | *Aucun (Bearer Token)* | `[ { id, tableNumber, items, specialNotes, ... } ]` |
| `POST` | `/api/cuisine/commandes/:id/terminer` | `cuisine`, `caisse`, `admin` | Finalisation de la préparation (Prête à servir) | *Aucun (Bearer Token)* | `{ success: true, order }` (Statut bascule en `PRETE`) |

---

### 5.5. Gestion d’État Centralisée (Stores Pinia)

1. **`authStore.js` :**
   * **State :** `token`, `user: { id, role, name }`, `isLoading`, `error`
   * **Getters :** `isAuthenticated`, `isCaisse`, `isCuisine`, `role`, `userName`
   * **Actions :** `login(pin)`, `logout()`, `verifySession()`
2. **`cartStore.js` :**
   * **State :** `items: []`, `customerName: ''`, `customerPhone: ''`, `tableNumber: ''`, `specialNotes: ''`
   * **Getters :** `totalPrice`, `totalCount`
   * **Actions :** `addItem(product, qty)`, `updateQuantity(id, qty)`, `removeItem(id)`, `clearCart()`
3. **`orderStore.js` :**
   * **State :** `currentOrder`, `lastOrder`, `isLoading`, `error`
   * **Actions :** `submitOrder(data)`, `fetchOrderStatus(orderId)`, `cancelOrder(orderId)`
4. **`menuStore.js` :**
   * **State :** `products: []`, `currentProduct: null`, `selectedCategory: 'Tous'`
   * **Getters :** `filteredProducts`
   * **Actions :** `fetchProducts()`, `fetchProductById(id)`, `setCategory(category)`

---

### 5.6. Système de Design Global (Dark & Gold)

Défini dans [`src/assets/styles/main.css`](./src/assets/styles/main.css), le design system valorise la haute gastronomie sahélienne :
* **Couleurs d'arrière-plan :** `--bg-dark: #0d0d0d`, `--bg-card: #141414`, `--bg-surface: #1a1a1a`
* **Accents dorés :** `--primary-gold: #c5a059`, `--primary-gold-hover: #d4af37`
* **Accents d'état :** Orange Money (`#ff9800`), Succès Cuisine (`#2ecc71`), Expiration / Alerte (`#e63946`)
* **Typographies :** *Playfair Display* (titres et logos sérifs élégants) et *Inter / Montserrat* (textes de lecture et boutons tactiles)

---

## 6. Organisation & Matrice des Responsabilités

Pour respecter le travail d'équipe (équipe de 6 personnes), le projet est structuré selon la matrice des responsabilités suivante :

| Rôle | Membre Assigné | Fichiers Cibles | Périmètre de Responsabilité |
| :--- | :--- | :--- | :--- |
| **Layout, Thème & Promotions** | Membre 1 | `main.css`, `Navbar.vue`, `Footer.vue`, `PromoBanner.vue` | Charte graphique Dark & Gold, barre de navigation avec badge réactif, pied de page et modales événements. |
| **Accueil & Plats Vedettes** | Membre 2 | `Home.vue`, `src/assets/images/` | Conception de la section Hero, mise en valeur des créations signatures du Chef et bouton d'action vers le menu. |
| **Catalogue & Filtrage** | Membre 3 | `Menu.vue`, `CategoryFilter.vue`, `ProductCard.vue` | Grille responsive des 18 spécialités, liaisons de catalogue et boutons de filtrage instantané par catégorie. |
| **Fiche Détail & Expérience Produit** | Membre 4 | `ProductDetails.vue` | Vue dynamique `/product/:id`, sélecteur numérique de quantité et ajout réactif au panier. |
| **Panier, Commande & Reçu** | Membre 5 | `Cart.vue`, `CartItem.vue`, `OrderConfirmation.vue` | Gestion du panier, formulaire Nom + Table + Téléphone et reçu numérique de confirmation. |
| **Lead Tech, Paiement & Sécurité** | Membre 6 (Lead) | `PaymentView.vue`, `LoginView.vue`, `DashboardView.vue`, `stores/`, `api/server.js`, `services/api.js` | Module de paiement USSD/QR Orange Money, minuteur TTL de stock, authentification par code PIN et Dashboard Caisse & Cuisine KDS. |
