# **Cahier des charges – Application de commande sur table pour restaurant**

## **1\. Résumé exécutif**

Ce projet consiste à concevoir et développer une application web moderne de commande sur table pour un restaurant, destinée exclusivement aux clients sur place. Développée avec **Vue.js 3** (Composition API) et **Pinia** pour la gestion d'état centralisée, l'application communique avec une API REST légère (Node.js / Express) s'appuyant sur des fichiers JSON pour la persistance des données. L'utilisateur navigue à travers 5 pages optimisées : Accueil, Menu, Détails du plat, Panier (avec saisie du nom et du numéro de table) et Confirmation de commande personnalisée. L'architecture garantit une séparation stricte des responsabilités, une modularité élevée grâce aux composants réutilisables et une parfaite fluidité responsive issue du prototypage UI.

## **2\. Objectifs du projet**

> * **Technologies principales :** Vue.js 3 (Composition API avec \<script setup\>), Vue Router 4, Pinia, API REST Node.js / Express, Axios / Fetch natif.  
> * **Fonctionnalités clés :**  
  * **Page Accueil :** Présentation du restaurant, section promotion / événement dynamique et mise en avant des plats vedettes.  
  * **Page Menu :** Catalogue complet des plats avec filtrage réactif par catégorie (Entrées, Plats, Desserts, Boissons).  
  * **Page Détails du plat :** Fiche descriptive complète avec sélection de quantité dynamique et ajout direct au panier.  
  * **Page Panier & Commande directe :** Consultation des articles, modification des quantités, calcul automatique du total, et saisie immédiate du **Nom du client** et du **Numéro de table**.  
  * **Page Confirmation :** Remerciement personnalisé, numéro de commande unique, rappel de la table et récapitulatif détaillé.  
> * **Composants réutilisables :** Navbar, Footer, PromoBanner, ProductCard, CategoryFilter, CartItem.  
> * **Persistance des données :** Lecture du catalogue depuis products.json et enregistrement des commandes clients dans orders.json.

## **3\. Arborescence du projet**

`restaurant-client/`  
`├── src/`  
`│   ├── assets/`  
`│   │   ├── images/              (Photos des plats, icônes, logos)`  
`│   │   └── styles/`  
`│   │       └── main.css         (Variables de thème, palette de couleurs, typographies)`  
`│   ├── components/              (Composants réutilisables)`  
`│   │   ├── Navbar.vue`  
`│   │   ├── Footer.vue`  
`│   │   ├── PromoBanner.vue      (Bannière réutilisable pour promotions et événements)`  
`│   │   ├── ProductCard.vue      (Carte individuelle d'un plat)`  
`│   │   ├── CategoryFilter.vue   (Boutons de filtre par catégorie)`  
`│   │   └── CartItem.vue         (Ligne du panier avec modification quantité/suppression)`  
`│   ├── views/`  
`│   │   └── client/              (Pages principales - Vues de l'application)`  
`│   │       ├── Home.vue`  
`│   │       ├── Menu.vue`  
`│   │       ├── ProductDetails.vue`  
`│   │       ├── Cart.vue         (Panier + Prise de commande sur table)`  
`│   │       └── OrderConfirmation.vue (Confirmation avec message personnalisé)`  
`│   ├── stores/                  (Stores Pinia partagés)`  
`│   │   ├── menuStore.js`  
`│   │   ├── cartStore.js`  
`│   │   └── orderStore.js`  
`│   ├── services/`  
`│   │   └── api.js               (Centralisation des appels HTTP)`  
`│   ├── router/`  
`│   │   └── index.js             (Configuration des 5 routes de l'application)`  
`│   ├── App.vue                  (Composant racine avec Navbar, router-view, Footer)`  
`│   └── main.js                  (Point d'entrée, initialisation Vue, Pinia et Router)`  
`├── api/                         (Serveur backend léger)`  
`│   ├── server.js                (API Express)`  
`│   ├── products.json            (Catalogue des plats)`  
`│   └── orders.json              (Historique des commandes enregistrées)`  
`├── package.json`  
`└── README.md`

## **4\. Description détaillée des pages et composants**

### **4.1. Les Vues (Pages)**

> * **Home.vue (Accueil) :**  
  * *Contenu :* Hero banner avec identité visuelle du restaurant, composant PromoBanner.vue pour les actualités, sélection de 3 à 4 plats vedettes affichés via ProductCard.vue, bouton CTA vers la page Menu.  
  * *Interactions :* Navigation vers les détails d'un plat ou redirection vers le menu complet.  
> * **Menu.vue (Catalogue complet) :**  
  * *Contenu :* Titre de section, composant CategoryFilter.vue pour filtrer la liste, grille responsive itérant sur ProductCard.vue.  
  * *Interactions :* Filtrage dynamique des plats selon la catégorie sélectionnée sans rechargement de page.  
> * **ProductDetails.vue (Fiche détaillée d'un plat) :**  
  * *Contenu :* Grande photo du plat, nom, catégorie, prix unitaire, description complète, sélecteur de quantité numérique (boutons \+ et \-), bouton "Ajouter au panier".  
  * *Interactions :* Récupération de l'ID via l'URL (route.params.id), appel store pour charger le plat, et ajout au panier avec la quantité choisie.  
> * **Cart.vue (Panier & Prise de commande sur table) :**  
  * *Contenu :* Liste des plats commandés via CartItem.vue, affichage du montant total, formulaire intégré avec champs "Nom du client" et "Numéro de table", bouton d'action "Lancer la commande".  
  * *Interactions :* Modification en direct des quantités, suppression d'articles, validation des champs du formulaire, envoi de la commande via orderStore.submitOrder(), vidage automatique du panier et redirection vers /confirmation.  
> * **OrderConfirmation.vue (Confirmation personnalisée) :**  
  * *Contenu :* Message personnalisé d'accueil (*"Merci \[Nom du client\] \!"*), indication du service (*"Votre commande arrive à la Table n°\[tableNumber\]"*), numéro unique de commande (orderId), récapitulatif détaillé des plats commandés avec le total, bouton "Retour au menu".  
  * *Interactions :* Lecture des informations stockées dans orderStore.lastOrder.

### **4.2. Matrice Pages vs Composants**

| Page (Vue) | Composants réutilisables intégrés | Fonctionnalités principales |
| :---- | :---- | :---- |
| **Home.vue** | Navbar, PromoBanner, ProductCard, Footer | Vitrine, offres promotionnelles et plats vedettes. |
| **Menu.vue** | Navbar, CategoryFilter, ProductCard, Footer | Catalogue global, filtrage instantané par catégorie. |
| **ProductDetails.vue** | Navbar, Footer | Fiche détaillée, sélection de quantité et ajout panier. |
| **Cart.vue** | Navbar, CartItem, Footer | Gestion du panier, saisie nom/table et validation de commande. |
| **OrderConfirmation.vue** | Navbar, Footer | Affichage du ticket de confirmation personnalisé. |

## **5\. Spécification Pinia (Stores)**

| Store | State (État) | Actions | Getters |
| :---- | :---- | :---- | :---- |
| **menuStore.js** | products: \[\] currentProduct: null selectedCategory: 'Tous' | fetchProducts() (GET /api/products) fetchProductById(id) (GET /api/products/:id) setCategory(category) | filteredProducts : retourne la liste filtrée selon la catégorie active. |
| **cartStore.js** | items: \[\] | addItem(product, qty) removeItem(productId) updateQuantity(productId, qty) clearCart() | totalPrice : somme totale des articles. totalCount : nombre cumulé d'articles pour le badge Navbar. |
| **orderStore.js** | lastOrder: null isLoading: false error: null | submitOrder(orderData) (POST /api/orders) : envoie les données complètes et stocke la confirmation avec orderId. | \- |

## **6\. Spécification de l'API REST JSON**

| Endpoint | Méthode | Corps de la requête (Request Body) | Réponse attendue | Codes statut HTTP |
| :---- | :---- | :---- | :---- | :---- |
| /api/products | GET | *Aucun* | Tableau d'objets produits : \[{ id, name, category, price, description, image }, ...\] | 200 (OK), 500 (Erreur serveur) |
| /api/products/:id | GET | *Aucun* (ID passé en paramètre URL) | Objet produit : { id, name, category, price, description, image } | 200 (OK), 404 (Introuvable) |
| /api/orders | POST | { customerName, tableNumber, items, total, date } | { orderId: 1725118400000, status: "created" } | 201 (Créé), 400 (Champs manquants) |

## **7\. Plan de travail et attribution des rôles (Équipe de 6 personnes)**

| Membre | Rôle principal | Fichiers assignés | Responsabilités clés |
| :---- | :---- | :---- | :---- |
| **Membre 1** | Layout, Thème & Promotions | main.css, Navbar.vue, Footer.vue, PromoBanner.vue | Intégration de la charte graphique globale, barre de navigation avec badge panier, pied de page et composant de promotion. |
| **Membre 2** | Accueil & Plats Vedettes | Home.vue, assets/images/ | Intégration du Hero banner, insertion de la bannière promo et affichage des 3 plats vedettes. |
| **Membre 3** | Catalogue & Filtrage | Menu.vue, CategoryFilter.vue, ProductCard.vue | Affichage dynamique de la carte des plats, mise en place des cartes produits et filtrage réactif par catégorie. |
| **Membre 4** | Fiche Détail Produit | ProductDetails.vue | Affichage des informations détaillées du plat selon l'ID d'URL, gestion des quantités (+ / \-) et ajout au panier. |
| **Membre 5** | Panier & Confirmation sur table | Cart.vue, CartItem.vue, OrderConfirmation.vue | Affichage du panier, formulaire de saisie Nom \+ N° de table, bouton de commande et écran de remerciement personnalisé. |
| **Membre 6 (Lead)** | Architecture, Pinia & API Backend | stores/, services/api.js, router/index.js, api/server.js | Initialisation Vite/Git, mise en place du routeur et des stores Pinia, serveur Express JSON et support technique IA de l'équipe. |

## **8\. Planning de livraison (Mardi à Vendredi)**

> * **Mardi :** Initialisation du projet Vite, dépôt GitHub, mise en place des stores, de l'API Node/Express, du thème CSS global et des composants de structure (Navbar, Footer, PromoBanner).  
> * **Mercredi :** Intégration complète des 5 vues (Home, Menu, ProductDetails, Cart, OrderConfirmation) avec leur HTML/CSS respectif et liaison aux composants enfants.  
> * **Jeudi :** Connexion globale des stores Pinia, synchronisation du panier et des commandes sur table, tests de bout en bout et vérification des écritures dans orders.json.  
> * **Vendredi :** Répétition générale de la démonstration orale en équipe et soutenance finale du projet.