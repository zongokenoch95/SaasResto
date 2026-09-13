<script setup>
import { onMounted, computed } from 'vue'
import { useMenuStore } from '@/stores/menuStore'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import PromoBanner from '@/components/PromoBanner.vue'
import ProductCard from '@/components/ProductCard.vue'

const menuStore = useMenuStore()

onMounted(async () => {
  if (menuStore.products.length === 0) {
    await menuStore.fetchProducts()
  }
})

// Sélectionne explicitement les plats avec les ID 1, 5 et 8
const featuredProducts = computed(() => {
  const targetIds = [1, 5, 14]
  return targetIds
    .map(id => menuStore.products.find(p => p.id === id))
    .filter(Boolean)
})
</script>

<template>
  <div class="home-page">
    <Navbar />

    <section class="hero-section">
      <div class="hero-overlay">
        <span class="sub-title">HAUTE GASTRONOMIE SAHÉLIENNE</span>
        <h1>Toute la saveur d'Afrique de l'Ouest en un seule endroit.</h1>
        <p>Une expérience sensorielle inédite où la tradition ancestrale rencontre l'élégance contemporaine.</p>
        <RouterLink to="/menu" class="btn-primary">CONSULTER LE MENU</RouterLink>
      </div>
    </section>

    <section class="featured-section">
      <div class="section-header">
        <div class="header-titles">
          <h2>Plats Vedettes</h2>
          <p class="section-subtitle">Les créations signatures de notre Chef, un voyage gustatif inoubliable.</p>
        </div>
        <RouterLink to="/menu" class="see-all">VOIR TOUT LE MENU →</RouterLink>
      </div>
      <div class="featured-grid">
        <ProductCard 
          v-for="product in featuredProducts" 
          v-bind:key="product.id" 
          :product="product" 
        />
      </div>
    </section>

    <PromoBanner />

    <Footer />
  </div>
</template>

<style scoped>
.home-page {
  background-color: #0d0d0d;
  color: #ffffff;
  min-height: 100vh;
}

.hero-section {
  height: 85vh;
  background: linear-gradient(rgba(13, 13, 13, 0.5), rgba(13, 13, 13, 0.95)), url('@/assets/images/couverture.png') center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 20px;
}

.sub-title {
  color: #c5a059;
  font-size: 0.8rem;
  letter-spacing: 3px;
  font-weight: 600;
  text-transform: uppercase;
}

.hero-overlay h1 {
  font-size: 3.2rem;
  margin: 15px 0;
  font-family: 'Playfair Display', serif;
  color: #f5f5f5;
  font-weight: normal;
}

.hero-overlay p {
  max-width: 650px;
  margin: 0 auto 35px;
  color: #b0b0b0;
  font-size: 0.95rem;
  line-height: 1.6;
}

.btn-primary {
  background-color: #c5a059;
  color: #0d0d0d;
  padding: 12px 30px;
  text-decoration: none;
  font-weight: bold;
  border-radius: 2px;
  letter-spacing: 1.5px;
  font-size: 0.85rem;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #d4af37;
}

.featured-section {
  max-width: 1200px;
  margin: 80px auto;
  padding: 0 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 40px;
}

.header-titles h2 {
  font-family: 'Playfair Display', serif;
  font-size: 2.2rem;
  color: #f5f5f5;
  margin-bottom: 8px;
}

.section-subtitle {
  color: #999999;
  font-size: 0.9rem;
}

.see-all {
  color: #c5a059;
  text-decoration: none;
  font-size: 0.85rem;
  letter-spacing: 1px;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}
</style>