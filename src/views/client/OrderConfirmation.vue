<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orderStore'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import PromoBanner from '@/components/PromoBanner.vue'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()

const order = ref(null)
const isLoading = ref(true)

const orderId = computed(() => route.params.id || orderStore.lastOrder?.id || orderStore.lastOrder?.orderId)

onMounted(async () => {
  if (orderId.value) {
    const data = await orderStore.fetchOrderStatus(orderId.value)
    order.value = data || orderStore.lastOrder
  } else {
    order.value = orderStore.lastOrder
  }
  isLoading.value = false
})

const goToMenu = () => {
  router.push('/menu')
}
</script>

<template>
  <div class="confirmation-page">
    <Navbar />

    <main class="container">
      <div v-if="isLoading" class="loading-box">
        <p>Chargement de votre reçu...</p>
      </div>

      <!-- Carte de confirmation principale -->
      <div class="confirmation-card" v-else-if="order">
        <div class="success-icon-wrapper">
          <div class="check-icon">✓</div>
        </div>
        
        <span class="paid-badge">PAIEMENT ORANGE MONEY VALIDÉ</span>

        <h1 class="thank-you-title">
          Merci pour votre commande, {{ order.customerName || 'Cher Client' }} !
        </h1>
        
        <p class="order-id-badge">RÉFÉRENCE : #{{ order.id || order.orderId }}</p>
        
        <div class="kitchen-status-alert">
          <span class="status-dot"></span>
          <span>Votre commande est en cours de préparation pour la <strong>Table n°{{ order.tableNumber }}</strong></span>
        </div>

        <div class="summary-box">
          <h3 class="summary-title">Récapitulatif de la commande</h3>
          
          <div class="summary-line" v-for="item in (order.items || [])" :key="item.product?.id || item.id">
            <span>{{ item.product?.name || item.name }} × {{ item.quantity }}</span>
            <span>{{ (((item.price || item.product?.price || 0) * (item.quantity || 1))).toLocaleString() }} FCFA</span>
          </div>

          <div class="summary-total">
            <span>Montant Total Réglé</span>
            <span class="total-price">{{ (order.montantTotal || order.total || 0).toLocaleString() }} FCFA</span>
          </div>
        </div>

        <button @click="goToMenu" class="btn-return">Commander d'autres articles</button>
      </div>

      <!-- Cas de secours si accès direct sans commande -->
      <div class="confirmation-card" v-else>
        <h2>Aucune commande récente trouvée</h2>
        <p>Vous pouvez consulter notre carte pour faire votre choix.</p>
        <button @click="goToMenu" class="btn-return">Consulter le menu</button>
      </div>

      <!-- Section Promotions & Événements -->
      <section class="promo-section">
        <PromoBanner />
      </section>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.confirmation-page {
  background-color: #0d0d0d;
  color: #fff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  flex: 1;
  max-width: 760px;
  width: 100%;
  margin: 3rem auto;
  padding: 0 1.2rem;
}

.loading-box {
  text-align: center;
  padding: 4rem 1rem;
  color: #aaa;
}

.confirmation-card {
  background-color: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 2.5rem 2rem;
  text-align: center;
  box-shadow: 0 12px 36px rgba(0,0,0,0.6);
}

.success-icon-wrapper {
  margin-bottom: 1rem;
}

.check-icon {
  width: 60px;
  height: 60px;
  background-color: rgba(46, 204, 113, 0.15);
  border: 2px solid #2ecc71;
  border-radius: 50%;
  color: #2ecc71;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-size: 2rem;
  font-weight: bold;
}

.paid-badge {
  display: inline-block;
  background-color: #1a3826;
  color: #2ecc71;
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 1px;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  margin-bottom: 1rem;
  border: 1px solid rgba(46, 204, 113, 0.4);
}

.thank-you-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.9rem;
  margin-bottom: 0.4rem;
  color: #f5f5f5;
}

.order-id-badge {
  color: #888;
  font-size: 0.85rem;
  letter-spacing: 1px;
  margin-bottom: 1.5rem;
}

.kitchen-status-alert {
  background-color: #1a1710;
  border: 1px solid rgba(212, 175, 55, 0.3);
  padding: 0.9rem 1.2rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  color: #d4af37;
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  background-color: #d4af37;
  border-radius: 50%;
  box-shadow: 0 0 6px #d4af37;
}

.summary-box {
  background-color: #1a1a1a;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: left;
  margin-bottom: 2rem;
  border: 1px solid #252525;
}

.summary-title {
  font-size: 0.95rem;
  color: #aaa;
  margin: 0 0 1rem 0;
  text-align: center;
  border-bottom: 1px solid #282828;
  padding-bottom: 0.6rem;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.8rem;
  font-size: 0.95rem;
  color: #ddd;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #282828;
  padding-top: 1rem;
  margin-top: 1rem;
  font-weight: bold;
}

.total-price {
  color: #2ecc71;
  font-size: 1.4rem;
}

.btn-return {
  background: #d4af37;
  border: none;
  color: #0d0d0d;
  padding: 0.85rem 2.2rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.95rem;
  transition: background-color 0.2s;
}

.btn-return:hover {
  background-color: #c5a059;
}

.promo-section {
  margin-top: 5rem;
}
</style>
