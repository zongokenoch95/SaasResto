<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cartStore'
import PromoBanner from '@/components/PromoBanner.vue'

const route = useRoute()
const cartStore = useCartStore()
const quantity = ref(1)

// Importation dynamique des images avec Vite
const images = import.meta.glob('@/assets/images/*', { eager: true, import: 'default' })

const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  const fileName = imagePath.split('/').pop()
  const matchedKey = Object.keys(images).find((key) => key.endsWith(fileName))
  return matchedKey ? images[matchedKey] : ''
}

// Liste complète avec tes 18 plats, leurs descriptions, ingrédients et allergènes
const productsList = [
  {
    id: 1,
    name: "Poulet braisé",
    category: "Plat",
    price: 3500,
    description: "Poulet braisé accompagné de riz et de légumes frais",
    image: "poulet.jpg",
    ingredients: ["Poulet fermier", "Riz parfumé", "Légumes frais de saison"],
    allergens: "Aucun"
  },
  {
    id: 2,
    name: "Salade composée",
    category: "Entrées",
    price: 2000,
    description: "Salade fraîche avec tomates, concombres, œufs et vinaigrette",
    image: "salade.jpg",
    ingredients: ["Tomates fraîches", "Concombres", "Œufs durs"],
    allergens: "Contient des œufs"
  },
  {
    id: 3,
    name: "Jus de Bissap",
    category: "Boissons",
    price: 500,
    description: "Boisson rafraîchissante locale à base de fleurs d'hibiscus",
    image: "bissap.jpg",
    ingredients: ["Fleurs d'hibiscus", "Sucre", "Menthe / Arômes naturels"],
    allergens: "Aucun"
  },
  {
    id: 4,
    name: "Alloco (Bananes plantains)",
    category: "Entrées",
    price: 1500,
    description: "Tranches de bananes plantains mûres et frites, servies avec piment",
    image: "alloco.jpg",
    ingredients: ["Bananes plantains mûres", "Huile végétale", "Piment artisanal"],
    allergens: "Aucun"
  },
  {
    id: 5,
    name: "Thiéboudienne (Riz au poisson et viande)",
    category: "Plat",
    price: 4000,
    description: "Plat traditionnel de riz rouge mijoté au poisson et légumes variés",
    image: "thieb.jpg",
    ingredients: ["Riz rouge cassé", "Poisson frais", "Légumes variés"],
    allergens: "Contient du poisson"
  },
  {
    id: 6,
    name: "Glace vanille / chocolat",
    category: "Desserts",
    price: 1000,
    description: "Boules de glace artisanale au choix",
    image: "glace.jpg",
    ingredients: ["Lait frais", "Vanille naturelle", "Chocolat noir"],
    allergens: "Contient des produits laitiers"
  },
  {
    id: 7,
    name: "Foutou Sauce graine(Banane , Igname)",
    category: "Plat",
    price: 2500,
    description: "Sauce graine accompagné de pate moulé de banane ou d'igname",
    image: "foutou.jpg",
    ingredients: ["Graines de palme", "Banane ou Igname", "Viande ou poisson"],
    allergens: "Aucun"
  },
  {
    id: 8,
    name: "Riz Gras au bœuf",
    category: "Plat",
    price: 2500,
    description: "Riz parfumé mijoté dans un bouillon riche avec morceaux de bœuf",
    image: "rizgras.jpg",
    ingredients: ["Riz parfumé", "Bouillon de viande riche", "Morceaux de bœuf"],
    allergens: "Aucun"
  },
  {
    id: 9,
    name: "Jus de Gingembre (Gnamakoudji)",
    category: "Boissons",
    price: 600,
    description: "Boisson énergisante et piquante à base de gingembre frais",
    image: "gingembre.jpg",
    ingredients: ["Gingembre frais", "Citron", "Sucre de canne"],
    allergens: "Aucun"
  },
  {
    id: 10,
    name: "Shewppes",
    category: "Boissons",
    price: 800,
    description: "Boisson Energisante",
    image: "shewppes.jpg",
    ingredients: ["Eau gazéifiée", "Sucre", "Extraits d'agrumes"],
    allergens: "Aucun"
  },
  {
    id: 11,
    name: "Salade de fruits frais",
    category: "Desserts",
    price: 1800,
    description: "Assortiment de fruits de saison découpés et parfumés à la menthe",
    image: "fruits.jpg",
    ingredients: ["Fruits de saison variés", "Menthe fraîche", "Jus de fruit naturel"],
    allergens: "Aucun"
  },
  {
    id: 12,
    name: "Crêpe au sucre",
    category: "Desserts",
    price: 1200,
    description: "Crêpe moelleuse nappée de sucre et beurre",
    image: "crepe.jpg",
    ingredients: ["Farine de blé", "Lait frais", "Sucre et beurre"],
    allergens: "Contient du gluten, produits laitiers, œufs"
  },
  {
    id: 13,
    name: "Orangina",
    category: "Boissons",
    price: 1000,
    description: "Jus d'orange pur",
    image: "orangina.jpg",
    ingredients: ["Jus d'orange concentré", "Pulpe d'orange", "Eau gazéifiée"],
    allergens: "Aucun"
  },
  {
    id: 14,
    name: "Mafé",
    category: "Plat",
    price: 2000,
    description: "Riz sauce arrachide accompagné de viande de boeuf ou de poisson",
    image: "mafe.jpg",
    ingredients: ["Pâte d'arachide", "Viande de bœuf ou poisson", "Riz blanc"],
    allergens: "Contient des arachides"
  },
  {
    id: 15,
    name: "Spaghetti",
    category: "Plat",
    price: 1500,
    description: "Plat de pattes accompagné de boullettes de viande",
    image: "pattes.jpg",
    ingredients: ["Pâtes spaghetti", "Boulettes de viande", "Sauce tomate maison"],
    allergens: "Contient du gluten"
  },
  {
    id: 16,
    name: "Brakina",
    category: "Boissons",
    price: 1000,
    description: "Bière de maïs",
    image: "brakina.jpg",
    ingredients: ["Maïs", "Malt", "Houblon"],
    allergens: "Contient du gluten"
  },
  {
    id: 17,
    name: "Beau Fort",
    category: "Boissons",
    price: 1000,
    description: "Bière de maïs",
    image: "beaufort.jpg",
    ingredients: ["Maïs", "Malt", "Houblon"],
    allergens: "Contient du gluten"
  },
  {
    id: 18,
    name: "Milk Chake",
    category: "Desserts",
    price: 1500,
    description: "Boisson glacée ultra-onctueuse préparée à base de lait frais et de crème glacée artisanale.",
    image: "chake.jpg",
    ingredients: ["Lait frais", "Crème glacée artisanale", "Arôme naturel"],
    allergens: "Contient des produits laitiers"
  }
]

// Récupération dynamique du produit en fonction de l'ID passé dans l'URL
const product = computed(() => {
  const productId = Number(route.params.id)
  return productsList.find(p => p.id === productId) || productsList[0]
})

const decrement = () => {
  if (quantity.value > 1) quantity.value--
}

const increment = () => {
  quantity.value++
}

const addToCart = () => {
  cartStore.addItem(product.value, quantity.value)
}
</script>

<template>
  <div class="page-container">
    <!-- Navbar -->
    <header class="navbar">
      <div class="nav-brand">Le Premium</div>
      <nav class="nav-links">
        <router-link to="/">Home</router-link>
        <router-link to="/menu">Menu</router-link>
      </nav>
      <div class="nav-cart">
        <router-link to="/cart" style="color: inherit; text-decoration: none;">
          🛒 <span class="cart-badge" v-if="cartStore.totalCount > 0">{{ cartStore.totalCount }}</span>
        </router-link>
      </div>
    </header>

    <!-- Product Details Section -->
    <main class="product-detail-section">
      <div class="product-grid">
        <div class="product-image-container">
          <img :src="getImageUrl(product.image)" :alt="product.name" />
        </div>
        
        <div class="product-info">
          <span class="product-category">{{ product.category }}</span>
          <h1 class="product-title">{{ product.name }}</h1>
          <div class="product-price">{{ product.price.toLocaleString() }} FCFA</div>
          
          <div class="info-block">
            <h3>Description</h3>
            <p>{{ product.description }}</p>
          </div>

          <div class="info-block" v-if="product.ingredients">
            <h3>Ingrédients</h3>
            <ul class="ingredients-list">
              <li v-for="(ing, index) in product.ingredients" :key="index">{{ ing }}</li>
            </ul>
          </div>

          <div class="info-block" v-if="product.allergens">
            <h3>Allergènes</h3>
            <p class="allergens-text">{{ product.allergens }}</p>
          </div>

          <div class="quantity-action-container">
            <div class="quantity-selector">
              <span class="qty-label">QUANTITÉ</span>
              <div class="qty-controls">
                <button @click="decrement">-</button>
                <span>{{ quantity }}</span>
                <button @click="increment">+</button>
              </div>
            </div>

            <button class="btn-add-cart" @click="addToCart">AJOUTER AU PANIER</button>
          </div>
        </div>
      </div>
    </main>

    <!-- Promo Banner Componentplein format -->
    <div class="promo-full-width">
      <PromoBanner />
    </div>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-brand">Le Premium</div>
      <div class="footer-info">
        <p>Mardi à Dimanche : 18h00 - 01h00</p>
        <p>+226 00 00 00 00</p>
      </div>
      <p class="footer-copy">© 2026 Le Premium. Elevated Afro-Gourmet Excellence.</p>
    </footer>
  </div>
</template>

<style scoped>
*, *::before, *::after {
  box-sizing: border-box;
}

.page-container {
  background-color: #0b0b0b;
  color: #f5f5f5;
  font-family: 'Playfair Display', serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
}

/* Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  border-bottom: 1px solid #1a1a1a;
  width: 100%;
}

.nav-brand {
  font-size: 1.5rem;
  color: #d4af37;
  font-style: italic;
}

.nav-links {
  display: flex;
  gap: 30px;
}

.nav-links a {
  color: #a0a0a0;
  text-decoration: none;
  font-size: 0.9rem;
  letter-spacing: 1px;
}

.nav-links a:hover {
  color: #d4af37;
}

.nav-cart {
  position: relative;
  cursor: pointer;
  font-size: 1.2rem;
}

.cart-badge {
  position: absolute;
  top: -8px;
  right: -10px;
  background-color: #d4af37;
  color: #000;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 50%;
  font-weight: bold;
}

/* Product Detail Section */
.product-detail-section {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 40px auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
}

.product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 50px;
  align-items: center;
  width: 100%;
}

.product-image-container {
  width: 100%;
}

.product-image-container img {
  width: 100%;
  height: 450px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #222;
  display: block;
}

.product-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
}

.product-category {
  display: inline-block;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #d4af37;
  margin-bottom: 10px;
}

.product-title {
  font-size: 2.5rem;
  color: #f5f5f5;
  margin-bottom: 10px;
  line-height: 1.2;
}

.product-price {
  font-size: 1.5rem;
  color: #d4af37;
  font-weight: bold;
  margin-bottom: 20px;
}

.info-block {
  margin-bottom: 20px;
}

.info-block h3 {
  font-size: 0.9rem;
  letter-spacing: 1.5px;
  color: #d4af37;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.info-block p, .info-block li {
  color: #a0a0a0;
  font-size: 0.95rem;
  line-height: 1.5;
  font-family: sans-serif;
}

.ingredients-list {
  list-style-type: disc;
  padding-left: 20px;
  margin: 0;
}

.allergens-text {
  font-size: 0.85rem;
  color: #888;
}

/* Quantity & Button */
.quantity-action-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 25px;
  width: 100%;
}

.quantity-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #141414;
  border: 1px solid #2a2a2a;
  padding: 10px 20px;
  border-radius: 4px;
  width: 100%;
}

.qty-label {
  font-size: 0.8rem;
  letter-spacing: 1px;
  color: #888;
  font-family: sans-serif;
}

.qty-controls {
  display: flex;
  align-items: center;
  gap: 20px;
  color: #fff;
  font-weight: bold;
}

.qty-controls button {
  background: none;
  border: none;
  color: #d4af37;
  font-size: 1.2rem;
  cursor: pointer;
}

.btn-add-cart {
  background-color: #d4af37;
  color: #000;
  border: none;
  padding: 14px;
  font-weight: bold;
  font-size: 0.95rem;
  letter-spacing: 1px;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.2s;
}

.btn-add-cart:hover {
  opacity: 0.9;
}

/* Promo Banner Full Width Force */
.promo-full-width {
  width: 100%;
  margin: 40px 0;
}

.promo-full-width :deep(> *) {
  width: 100% !important;
  max-width: 100% !important;
  border-radius: 0 !important;
  margin: 0 !important;
}

/* Footer */
.footer {
  border-top: 1px solid #1a1a1a;
  padding: 40px 20px;
  text-align: center;
  width: 100%;
  margin-top: auto;
}

.footer-brand {
  font-size: 1.3rem;
  color: #d4af37;
  font-style: italic;
  margin-bottom: 10px;
}

.footer-info p {
  color: #888;
  font-size: 0.9rem;
  font-family: sans-serif;
  margin-bottom: 4px;
}

.footer-copy {
  color: #555;
  font-size: 0.75rem;
  font-family: sans-serif;
  margin-top: 20px;
}

/* Responsiveness for smaller screens */
@media (max-width: 768px) {
  .product-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}
</style>