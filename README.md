# 🍽️ RestoPremium – Le Premium

> **Application web de commande sur table – Haute Gastronomie Sahélienne & Afro-Gourmet**  
> *Projet réalisé dans le cadre du sujet :* **« Conception d’une interface Frontend réactive en composants »**  
> *Focus technique :* Architecture par composants avec **Vue.js 3** et gestion d’état centralisée avec **Pinia**.

---

## 📑 Table des Matières

1. [Présentation du Projet](#1-présentation-du-projet)
2. [Matrice de Conformité des Livrables](#2-matrice-de-conformité-des-livrables)
3. [Démarrage Rapide & Installation](#3-démarrage-rapide--installation)
4. [Guide Utilisateur (Parcours Client)](#4-guide-utilisateur-parcours-client)
   * [4.1. Parcours de Commande sur Table](#41-parcours-de-commande-sur-table)
   * [4.2. F.A.Q & Bonnes Pratiques](#42-faq--bonnes-pratiques)
5. [Documentation Technique & Architecture](#5-documentation-technique--architecture)
   * [5.1. Stack Technique & Bibliothèques](#51-stack-technique--bibliothèques)
   * [5.2. Architecture Globale & Flux de Données](#52-architecture-globale--flux-de-données)
   * [5.3. Arborescence du Projet](#53-arborescence-du-projet)
   * [5.4. Environnement de Build & Proxy Vite](#54-environnement-de-build--proxy-vite)
   * [5.5. Architecture par Composants](#55-architecture-par-composants)
   * [5.6. Gestion d’État Centralisée (Stores Pinia)](#56-gestion-détat-centralisée-stores-pinia)
   * [5.7. Spécification de l'API REST JSON (Backend Express)](#57-spécification-de-lapi-rest-json-backend-express)
   * [5.8. Système de Design Global (Dark & Gold)](#58-système-de-design-global-dark--gold)
6. [Organisation & Matrice des Responsabilités](#6-organisation--matrice-des-responsabilités)

---

## 1. Présentation du Projet

**RestoPremium** est une application web moderne, tactile et responsive conçue pour un restaurant gastronomique.  
Elle permet aux clients attablés de vivre une expérience interactive complète :
* Découvrir l'univers du restaurant et les créations signatures du Chef.
* Parcourir la carte complète avec un filtrage instantané par catégorie.
* Consulter la fiche détaillée d'un plat et ajuster les portions désirées.
* Gérer leur panier en direct, renseigner leur nom et numéro de table, et valider leur commande.
* Obtenir un reçu numérique personnalisé avec référence unique de suivi.

---

## 2. Matrice de Conformité des Livrables

| Livrable Demandé | Statut | Réalisation Concrète | Fichiers / Emplacement |
| :--- | :---: | :--- | :--- |
| **1. Maquettes** | ✅ Réalisé | 5 maquettes graphiques haute résolution couvrant l'ensemble du parcours client | [Dossier `Ressources/`](./Ressources/) (`1.Accueil.png`, `2.Menu.png`, `3.Détail.png`, `4.Panier.png`, `5.Confirmation.png`) |
| **2. Composants** | ✅ Réalisé | 6 composants Vue.js réutilisables, modulaires et découplés | `src/components/` (`Navbar.vue`, `Footer.vue`, `ProductCard.vue`, `CategoryFilter.vue`, `CartItem.vue`, `PromoBanner.vue`) |
| **3. Pages principales** | ✅ Réalisé | 5 vues clientes complètes structurées avec Vue Router | `src/views/client/` (`Home.vue`, `Menu.vue`, `ProductDetails.vue`, `Cart.vue`, `OrderConfirmation.vue`) |
| **4. Gestion d’état** | ✅ Réalisé | 3 stores Pinia réactifs centralisant l'état global, getters calculés et actions | `src/stores/` (`menuStore.js`, `cartStore.js`, `orderStore.js`) |
| **5. Appels API** | ✅ Réalisé | Service HTTP centralisé connecté à l'API REST Express avec persistance JSON | `src/services/api.js` et `api/server.js` (`/api/products`, `/api/orders`) |
| **6. Guide utilisateur** | ✅ Réalisé | Manuel complet pas-à-pas de l'expérience client intégré ci-dessous | Section [4. Guide Utilisateur](#4-guide-utilisateur-parcours-client) |

---

## 3. Démarrage Rapide & Installation

### Prérequis
* **Node.js** (v18+ ou v22+)
* **NPM** (v9+ ou v10+)

### 1. Installation des dépendances
```bash
npm install
```

### 2. Démarrer le serveur Backend (Port 3000)
```bash
node api/server.js
# ou
npm run server
```
*Le terminal affiche :* `✅ Serveur backend démarré sur http://localhost:3000`

### 3. Démarrer le serveur Frontend (Port 5173)
```bash
npm run dev
```
*Le client Vite est prêt sur :* `http://localhost:5173`

### 4. Liens d'accès direct
* 🏠 **Accueil :** [http://localhost:5173/](http://localhost:5173/)
* 🍽️ **Menu & Filtres :** [http://localhost:5173/menu](http://localhost:5173/menu)
* 🛒 **Panier & Prise de Commande :** [http://localhost:5173/cart](http://localhost:5173/cart)

### 5. Build de production
```bash
npm run build
```
Compile les assets optimisés dans le dossier `dist/` sans avertissement ni erreur.

---

## 4. Guide Utilisateur (Parcours Client)

### 4.1. Parcours de Commande sur Table

```
[ Accueil (/) ] ➔ [ Menu (/menu) ] ➔ [ Fiche Plat (/product/:id) ] ➔ [ Panier (/cart) ] ➔ [ Confirmation (/confirmation) ]
```

#### Étape 1 : Découverte sur la Page d'Accueil (`/`)
* **Hero Banner :** Immersion dans la haute gastronomie avec bouton d'action direct *« CONSULTER LE MENU »*.
* **Plats Vedettes :** Présentation des créations signatures du Chef (Poulet braisé, Thiéboudienne, Mafé). Vous pouvez cliquer sur un plat pour voir ses détails ou sur le bouton *« + Ajouter »* pour l'insérer directement dans le panier.
* **Espace Promotions & Événements :** Deux cartes d'événements exclusifs (*Soirée Dégustation Royale* et *Soirée Karaoké & Cocktails*). Cliquez sur les visuels pour ouvrir l'affiche complète en grand format haute résolution.
* **Barre de Navigation :** Reste fixée en haut avec le **badge réactif** du panier qui s'incrémente automatiquement à chaque ajout.

#### Étape 2 : Consultation et Filtrage de la Carte (`/menu`)
* Cliquez sur les boutons de filtres pour affiner l'affichage instantanément sans rechargement de page :
  * **Tous** : L'ensemble du catalogue (18 spécialités).
  * **Entrées** : Salade composée, Alloco...
  * **Plats** : Poulet braisé, Thiéboudienne, Foutou sauce graine, Riz gras, Mafé, Spaghetti...
  * **Desserts** : Glaces artisanales, Salade de fruits, Crêpes, Milk Shake...
  * **Boissons** : Jus de Bissap, Jus de Gingembre (Gnamakoudji), Orangina, Brakina, Beaufort, Schweppes...
* Chaque carte présente la photo, le libellé, la description, le prix en FCFA et l'action d'ajout.

#### Étape 3 : Fiche Détaillée d'un Plat (`/product/:id`)
* En cliquant sur une carte de plat, la fiche complète s'ouvre.
* Utilisez le sélecteur numérique (**`-`** et **`+`**) pour choisir le nombre de portions.
* Le montant total recalculé en direct s'affiche.
* Cliquez sur **« Ajouter au panier »** : une animation confirme l'ajout et le badge Navbar s'actualise.

#### Étape 4 : Gestion du Panier & Saisie de la Table (`/cart`)
* Cliquez sur l'icône du panier dans la barre de navigation.
* **Vérification :** Modifiez les quantités ou supprimez un plat via l'icône de suppression.
* **Formulaire de commande sur table :**
  1. **Nom du client :** Saisissez votre nom ou prénom (ex: *M. Zongo*).
  2. **Numéro de table :** Renseignez le numéro figurant sur votre table (ex: *12*).
  3. **Instructions spéciales (optionnel) :** Précisez vos préférences (ex: *« Piment doux »*, *« Sans oignons »*, *« Viande bien cuite »*).
* **Validation :** Cliquez sur **« Passer la commande → »**. La commande est enregistrée côté serveur et le panier est réinitialisé.

#### Étape 5 : Reçu & Confirmation Personnalisée (`/confirmation`)
* Affichage du message nominatif : *« Merci [Votre Nom] ! Votre commande arrive à la Table n°[X] »*.
* Attribution d'un numéro de référence unique (`orderId`) pour le suivi avec le personnel de salle.
* Récapitulatif complet des spécialités commandées avec le montant total en FCFA.
* Bouton *« Retour au menu »* permettant de passer d'éventuelles commandes d'appoint au cours du repas.

---

### 4.2. F.A.Q & Bonnes Pratiques

* **Puis-je modifier une commande envoyée ?**  
  Une commande validée est immédiatement enregistrée dans le système. Pour tout ajout ou ajustement ultérieur, adressez-vous directement au personnel de salle.
* **Que se passe-t-il en cas d'erreur de saisie ?**  
  Le formulaire du panier intègre des vérifications pour interdire l'envoi si le nom ou le numéro de table est manquant.
* **Compatibilité mobile :**  
  L'application est 100% responsive et optimisée pour smartphone, tablette et grand écran de caisse.

---

## 5. Documentation Technique & Architecture

### 5.1. Stack Technique & Bibliothèques

* **Frontend Framework :** Vue.js 3.5+ (Composition API, `<script setup>`)
* **State Management :** Pinia 4.0+ (Gestion d'état centralisée et réactive)
* **Routage :** Vue Router 4.6+ (Mode WebHistory HTML5)
* **Outil de Build :** Vite 8.2+ (HMR ultra-rapide, bundling optimisé)
* **Backend :** Node.js avec Express 5.2+, CORS, FS natif
* **Persistance :** Fichiers JSON (`products.json`, `orders.json`)
* **Client HTTP :** Fetch API natif via couche de services dédiée
* **Styles :** CSS3 natif avec variables sémantiques, Reset moderne et typographie Google Fonts (*Playfair Display* & *Inter*)

---

### 5.2. Architecture Globale & Flux de Données

```
+---------------------------------------------------------------------------------+
|                                NAVIGATEUR CLIENT                                |
|                                                                                 |
|  [ Vues Client : Home | Menu | ProductDetails | Cart | OrderConfirmation ]       |
|                           |                           ^                         |
|                           v                           |                         |
|  [ Composants : Navbar | ProductCard | CategoryFilter | CartItem | PromoBanner ]|
|                           |                                                     |
|                           v                                                     |
|  [ Pinia Stores : menuStore | cartStore | orderStore ]                          |
|                           |                                                     |
|                           v                                                     |
|  [ Service HTTP : src/services/api.js (fetch('/api/...')) ]                     |
+---------------------------|-----------------------------------------------------+
                            | Requête HTTP
                            v
+---------------------------------------------------------------------------------+
|                      SERVEUR VITE (Port 5173 - Dev Proxy)                       |
|                  Redirige automatiquement /api/* vers :3000                     |
+---------------------------|-----------------------------------------------------+
                            | Proxy Pass
                            v
+---------------------------------------------------------------------------------+
|                    SERVEUR BACKEND (Node.js / Express :3000)                    |
|                                                                                 |
|  - GET  /api/products             -> Lecture de api/products.json               |
|  - GET  /api/products/:id         -> Filtre le produit demandé                  |
|  - POST /api/orders               -> Écriture atomique dans api/orders.json     |
+---------------------------------------------------------------------------------+
```

---

### 5.3. Arborescence du Projet

```
RestoPremium/
├── api/
│   ├── orders.json                  # Commandes transmises par les tables
│   ├── products.json                # Catalogue complet des 18 spécialités
│   └── server.js                    # API REST Node.js / Express (Port 3000)
├── public/
│   ├── favicon.svg                  # Icône de l'application
│   └── icons.svg                    # Sprite d'icônes SVG
├── Ressources/                      # Maquettes UI et cahier des charges
│   ├── 1.Accueil - Le Premium.png
│   ├── 2.Menu.png
│   ├── 3.Détail du Plat - Le Premium (Updated).png
│   ├── 4.Votre Panier - Le Premium (Updated).png
│   ├── 5.Confirmation - Le Premium (Updated).png
│   └── Cahier des charges mis a jour - Application Restaurant (Commande sur table).md
├── src/
│   ├── assets/
│   │   ├── images/                  # Visuels HD des spécialités et affiches
│   │   └── styles/
│   │       └── main.css             # Variables de thème, typographies, styles globaux
│   ├── components/                  # Composants réutilisables
│   │   ├── CartItem.vue             # Ligne de commande modifiable du panier
│   │   ├── CategoryFilter.vue       # Filtres réactifs par catégorie
│   │   ├── Footer.vue               # Pied de page institutionnel
│   │   ├── Navbar.vue               # Barre de navigation avec badge panier dynamique
│   │   ├── ProductCard.vue          # Carte individuelle d'un plat avec ajout direct
│   │   └── PromoBanner.vue          # Espace promotions & événements avec modale affiche
│   ├── router/
│   │   └── index.js                 # Définition des 5 routes clientes
│   ├── services/
│   │   └── api.js                   # Centralisation des appels Fetch vers /api/*
│   ├── stores/                      # Stores Pinia partagés
│   │   ├── cartStore.js             # État du panier, totaux et quantités
│   │   ├── menuStore.js             # État des plats, filtre actif et sélections
│   │   └── orderStore.js            # Transmission de la commande et suivi
│   ├── views/
│   │   └── client/                  # Les 5 pages clientes de l'application
│   │       ├── Cart.vue
│   │       ├── Home.vue
│   │       ├── Menu.vue
│   │       ├── OrderConfirmation.vue
│   │       └── ProductDetails.vue
│   ├── App.vue                      # Composant racine avec <router-view />
│   └── main.js                      # Point d'entrée, initialisation Vue, Pinia et Router
├── index.html                       # Document HTML racine
├── package.json                     # Dépendances et scripts de démarrage
├── README.md                        # Documentation unifiée du projet
└── vite.config.js                   # Configuration Vite (alias '@' et proxy API)
```

---

### 5.4. Environnement de Build & Proxy Vite

Dans `vite.config.js`, deux mécanismes majeurs garantissent la stabilité du projet :
1. **Alias `@`** : Mappe directement vers le dossier `src/` via `fileURLToPath(new URL('./src', import.meta.url))`, évitant les chemins relatifs fragiles (`../../`).
2. **Reverse Proxy `/api`** : Redirige de manière transparente toutes les requêtes frontend débutant par `/api` vers le backend Express sur le port `3000`.

```javascript
// vite.config.js
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

---

### 5.5. Architecture par Composants

Chaque composant répond à un périmètre précis :
* **`Navbar.vue` :** Intègre le logo sérif doré, les liens de navigation actifs et le badge de panier réactif branché sur `cartStore.totalCount`.
* **`ProductCard.vue` :** Résout les images locales dynamiquement (`import.meta.glob`), affiche la note/tag, le prix en FCFA et gère l'ajout rapide au panier.
* **`CategoryFilter.vue` :** Génère les boutons de sélection et applique la classe active selon `menuStore.selectedCategory`.
* **`CartItem.vue` :** Encapsule les contrôles de quantité (`+` / `-`), le calcul du sous-total de la ligne et l'action de suppression.
* **`PromoBanner.vue` :** Affiche les événements sous forme de cartes élégantes avec agrandissement des affiches en modale plein écran.

---

### 5.6. Gestion d’État Centralisée (Stores Pinia)

#### 1. `menuStore.js`
* **State :** `products: []`, `currentProduct: null`, `selectedCategory: 'Tous'`
* **Getters :**
  * `filteredProducts` : Filtre la liste des plats selon la catégorie sélectionnée (ou tous si `'Tous'`).
* **Actions :**
  * `fetchProducts()` : Récupère la liste depuis `GET /api/products`.
  * `fetchProductById(id)` : Charge un plat ciblé depuis `GET /api/products/:id`.
  * `setCategory(category)` : Change la catégorie active.

#### 2. `cartStore.js`
* **State :** `items: []`, `customerName: ''`, `tableNumber: ''`, `specialNotes: ''`
* **Getters :**
  * `totalPrice` : Somme cumulée (`price * quantity`).
  * `totalCount` : Nombre total d'articles dans le panier.
* **Actions :**
  * `addItem(product, qty)` : Ajoute un plat ou incrémente sa quantité s'il est déjà présent.
  * `updateQuantity(productId, qty)` : Ajuste la quantité ou supprime si `<= 0`.
  * `removeItem(productId)` : Retire un plat du panier.
  * `clearCart()` : Réinitialise le panier et les champs du formulaire.

#### 3. `orderStore.js`
* **State :** `lastOrder: null`, `isLoading: false`, `error: null`
* **Actions :**
  * `submitOrder(orderData)` : Construit la charge utile complète, appelle `POST /api/orders`, enregistre la réponse dans `lastOrder` et vide le panier.

---

### 5.7. Spécification de l'API REST JSON (Backend Express)

Le backend Express écoute sur le port **3000** et expose les points d'accès suivants :

| Méthode | Endpoint | Description | Données Entrantes | Données Sortantes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Récupère tous les plats du catalogue | *Aucun* | `[ { id, name, category, price, description, image }, ... ]` |
| `GET` | `/api/products/:id` | Récupère la fiche d'un plat par son ID | Paramètre `:id` | Objet plat ou erreur 404 |
| `POST` | `/api/orders` | Enregistre une commande client sur table | Objet commande complet | `{ orderId: 1725468000000, status: "created" }` (201 Created) |

---

### 5.8. Système de Design Global (Dark & Gold)

Le design system défini dans `src/assets/styles/main.css` s'appuie sur une esthétique sombre et raffinée adaptée à la haute gastronomie :
* **Couleurs de fond :** `--bg-dark: #0d0d0d`, `--bg-card: #141414`, `--bg-surface: #1a1a1a`
* **Accents dorés :** `--primary-gold: #c5a059`, `--primary-gold-hover: #d4af37`
* **Typographies :** *Playfair Display* (titres et logos sérif en italique) et *Inter / Montserrat* (textes courants et boutons)
* **Utilitaires intégrés :** `.container`, `.btn-gold`, `.btn-gold-outline`, `.card-dark`, `.form-input`

---

## 6. Organisation & Matrice des Responsabilités

Pour respecter le travail d'équipe (équipe de 6 personnes), le projet est structuré selon la matrice des rôles suivante :

| Rôle | Membre Assigné | Fichiers Cibles | Périmètre de Responsabilité |
| :--- | :--- | :--- | :--- |
| **Layout, Thème & Promotions** | Membre 1 | `main.css`, `Navbar.vue`, `Footer.vue`, `PromoBanner.vue` | Intégration de la charte graphique, barre de navigation avec badge panier, pied de page et bannières promotionnelles. |
| **Accueil & Plats Vedettes** | Membre 2 | `Home.vue`, `src/assets/images/` | Conception de la section Hero, mise en avant des créations signatures du Chef et bouton d'appel à l'action. |
| **Catalogue & Filtrage** | Membre 3 | `Menu.vue`, `CategoryFilter.vue`, `ProductCard.vue` | Grille responsive des plats, liaisons avec le catalogue et boutons de filtrage instantané par catégorie. |
| **Fiche Détail Produit** | Membre 4 | `ProductDetails.vue` | Vue dynamique `/product/:id`, sélecteur numérique de quantité et ajout réactif au panier. |
| **Panier & Prise de Commande** | Membre 5 | `Cart.vue`, `CartItem.vue`, `OrderConfirmation.vue` | Gestion des quantités du panier, formulaire Nom + Table et confirmation personnalisée. |
| **Lead Tech & Architecture** | Membre 6 (Lead) | `stores/`, `services/api.js`, `router/`, `api/server.js`, `vite.config.js` | Initialisation du projet, stores Pinia, serveur Express avec persistance JSON, proxy de développement et intégration générale. |
