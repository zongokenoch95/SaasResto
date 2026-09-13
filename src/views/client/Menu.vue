<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menuStore'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import CategoryFilter from '@/components/CategoryFilter.vue'
import ProductCard from '@/components/ProductCard.vue'

const menuStore = useMenuStore()
const activeCategory = ref('Tous')
const searchQuery = ref('')

onMounted(() => {
  menuStore.fetchMenu()
})

// Catégories alignées sur le fichier JSON de la base de données
const categories = ['Tous', 'Entrées', 'Plat', 'Boissons', 'Desserts']

const filteredProducts = computed(() => {
  if (!menuStore.products) return []
  let result = menuStore.products
  
  // Filtre par catégorie exacte
  if (activeCategory.value !== 'Tous') {
    result = result.filter(p => p.category === activeCategory.value)
  }
  
  // Filtre par recherche texte
  if (searchQuery.value.trim() !== '') {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => p.name.toLowerCase().includes(query))
  }
  
  return result
})

const handleCategorySelect = (category) => {
  activeCategory.value = category
}
</script>

<template>
  <div class="menu-page">
    <Navbar />

    <main class="menu-content">
      <header class="menu-header">
        <h1>Notre Carte</h1>
        <p>Découvrez l'excellence afro-gourmande. Une fusion subtile entre héritage traditionnel et haute gastronomie contemporaine.</p>
      </header>

      <!-- Barre de recherche -->
      <div class="search-container">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher un plat d'exception..." 
          class="search-input"
        />
      </div>

      <CategoryFilter 
        :categories="categories" 
        :activeCategory="activeCategory" 
        @select-category="handleCategorySelect" 
      />

      <div v-if="menuStore.isLoading" class="loading">Chargement du menu...</div>
      <div v-else-if="menuStore.error" class="error">{{ menuStore.error }}</div>

      <!-- Si la catégorie est vide, la page affichera naturellement cet état vide -->
      <div v-else-if="filteredProducts.length === 0" class="empty-state">
        <p>Aucun plat disponible pour cette catégorie pour le moment.</p>
      </div>

      <div v-else class="products-grid">
        <ProductCard 
          v-for="product in filteredProducts" 
          :key="product.id" 
          :product="product" 
        />
      </div>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.menu-page {
  background-color: #0d0d0d;
  color: #fff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.menu-content {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 40px 20px;
}

.menu-header {
  text-align: center;
  margin-bottom: 30px;
}

.menu-header h1 {
  font-family: 'Playfair Display', serif;
  font-size: 2.8rem;
  color: #f5f5f5;
  margin-bottom: 12px;
  font-weight: normal;
}

.menu-header p {
  color: #a0a0a0;
  font-size: 0.95rem;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.5;
}

.search-container {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.search-input {
  width: 100%;
  max-width: 400px;
  background-color: #141414;
  border: 1px solid #2a2a2a;
  color: #fff;
  padding: 10px 18px;
  border-radius: 25px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #c5a059;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-top: 40px;
}

.loading, .error, .empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #888888;
  font-size: 1rem;
}

.error {
  color: #ff6b6b;
}
</style>