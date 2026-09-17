<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cartStore'

const cartStore = useCartStore()
const route = useRoute()

// Ne pas afficher la barre flottante sur les pages où le panier ou paiement est déjà affiché
const isExcludedRoute = computed(() => {
  const name = route.name
  const path = route.path || ''
  return (
    name === 'Cart' ||
    name === 'Payment' ||
    name === 'OrderConfirmation' ||
    path.includes('/caisse') ||
    path.includes('/cuisine') ||
    path.includes('/admin') ||
    path.includes('/login') ||
    path.includes('/restaurant') ||
    path.includes('/confirmation') ||
    path.includes('/paiement')
  )
})

const isVisible = computed(() => {
  return cartStore.totalCount > 0 && !isExcludedRoute.value
})
</script>

<template>
  <transition name="floating-cart-slide">
    <router-link 
      v-if="isVisible" 
      :to="{ name: 'Cart' }" 
      class="mobile-floating-cart"
      aria-label="Voir mon panier et commander"
    >
      <div class="cart-left">
        <div class="cart-icon-wrap">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span class="floating-badge">{{ cartStore.totalCount }}</span>
        </div>
        <div class="cart-info">
          <span class="cart-label">{{ cartStore.totalCount }} plat{{ cartStore.totalCount > 1 ? 's' : '' }}</span>
          <span class="cart-total">{{ (cartStore.totalPrice || 0).toLocaleString() }} FCFA</span>
        </div>
      </div>

      <div class="cart-action-btn">
        <span>Voir mon panier</span>
        <span class="cart-arrow">→</span>
      </div>
    </router-link>
  </transition>
</template>

<style scoped>
.mobile-floating-cart {
  display: none;
  position: fixed;
  bottom: 20px;
  left: 16px;
  right: 16px;
  z-index: 999;
  background: linear-gradient(135deg, #181818 0%, #111111 100%);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 14px;
  padding: 12px 16px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.65), 0 0 15px rgba(212, 175, 55, 0.2);
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.cart-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cart-icon-wrap {
  position: relative;
  width: 38px;
  height: 38px;
  background: rgba(212, 175, 55, 0.15);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d4af37;
  flex-shrink: 0;
}

.floating-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #e11d48;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  min-width: 17px;
  height: 17px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #111;
  padding: 0 3px;
}

.cart-info {
  display: flex;
  flex-direction: column;
}

.cart-label {
  font-size: 0.75rem;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cart-total {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
}

.cart-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #d4af37;
  color: #0d0d0d;
  font-weight: 700;
  font-size: 0.88rem;
  padding: 8px 16px;
  border-radius: 8px;
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.mobile-floating-cart:active .cart-action-btn {
  transform: scale(0.96);
  background-color: #c5a059;
}

.cart-arrow {
  font-size: 1rem;
  transition: transform 0.2s ease;
}

.mobile-floating-cart:active .cart-arrow {
  transform: translateX(3px);
}

/* Animations d'entrée / sortie fluide */
.floating-cart-slide-enter-active,
.floating-cart-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.floating-cart-slide-enter-from,
.floating-cart-slide-leave-to {
  opacity: 0;
  transform: translateY(40px) scale(0.95);
}

/* Affichage uniquement sur Mobile (< 768px) */
@media (max-width: 768px) {
  .mobile-floating-cart {
    display: flex;
  }
}
</style>

