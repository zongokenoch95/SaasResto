<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cartStore'

const cartStore = useCartStore()
const route = useRoute()
const isMobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// Fermer le menu mobile lors d'un changement de page
watch(() => route.path, () => {
  closeMobileMenu()
})
</script>

<template>
  <header class="navbar">
    <div class="container navbar-container">
      <!-- Logo / Marque -->
      <router-link :to="{ name: 'Home' }" class="navbar-brand" @click="closeMobileMenu">
        <span class="brand-text">Le Premium</span>
      </router-link>

      <!-- Navigation Desktop (Cachée sur mobile) -->
      <nav class="navbar-nav desktop-nav">
        <router-link :to="{ name: 'Home' }" class="nav-link" active-class="active">Home</router-link>
        <router-link :to="{ name: 'Menu' }" class="nav-link" active-class="active">Menu</router-link>
        <router-link :to="{ name: 'DashboardRestaurant' }" class="nav-link restaurant-nav-link" active-class="active">
          <span class="pro-badge">Staff</span> Restaurant
        </router-link>
      </nav>

      <!-- Actions de droite : Panier (TOUJOURS VISIBLE) + Bouton Hamburger sur mobile -->
      <div class="navbar-actions">
        <!-- Bouton Panier : Garanti 100% visible et non masqué sur mobile -->
        <router-link 
          :to="{ name: 'Cart' }" 
          class="cart-btn" 
          aria-label="Consulter mon panier"
          @click="closeMobileMenu"
        >
          <svg class="cart-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span class="cart-badge" :class="{ 'has-items': cartStore.totalCount > 0 }">
            {{ cartStore.totalCount }}
          </span>
        </router-link>

        <!-- Bouton Toggle Menu Mobile (Visible uniquement <= 768px) -->
        <button 
          class="menu-toggle-btn" 
          @click="toggleMobileMenu" 
          :aria-expanded="isMobileMenuOpen"
          aria-label="Menu principal"
        >
          <svg v-if="!isMobileMenuOpen" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- Tiroir déroulant de navigation Mobile -->
    <transition name="drawer-fade">
      <div v-if="isMobileMenuOpen" class="mobile-nav-drawer">
        <nav class="mobile-nav-links">
          <router-link :to="{ name: 'Home' }" class="mobile-nav-link" active-class="active" @click="closeMobileMenu">
            <span class="mobile-link-icon"></span>
            <span>Accueil</span>
          </router-link>

          <router-link :to="{ name: 'Menu' }" class="mobile-nav-link" active-class="active" @click="closeMobileMenu">
            <span class="mobile-link-icon"></span>
            <span>Notre Carte / Menu</span>
          </router-link>

          <router-link :to="{ name: 'Cart' }" class="mobile-nav-link" active-class="active" @click="closeMobileMenu">
            <span class="mobile-link-icon"></span>
            <span>Mon Panier</span>
            <span v-if="cartStore.totalCount > 0" class="mobile-cart-badge">
              {{ cartStore.totalCount }} article{{ cartStore.totalCount > 1 ? 's' : '' }}
            </span>
          </router-link>

          <div class="mobile-nav-divider"></div>

          <router-link :to="{ name: 'DashboardRestaurant' }" class="mobile-nav-link staff-link" active-class="active" @click="closeMobileMenu">
            <span class="mobile-link-icon"></span>
            <span>Espace Restaurant (Caisse & Cuisine)</span>
          </router-link>
        </nav>
      </div>
    </transition>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: rgba(13, 13, 13, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  width: 100%;
}

.navbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  box-sizing: border-box;
}

.navbar-brand {
  text-decoration: none;
  flex-shrink: 0;
}

.brand-text {
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-size: 1.75rem;
  font-weight: 700;
  color: #c5a059;
  letter-spacing: 0.5px;
}

/* Navigation Desktop */
.navbar-nav {
  display: flex;
  align-items: center;
  gap: 2.5rem;
}

.nav-link {
  color: #e5e5e5;
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
  padding: 0.4rem 0;
  position: relative;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #c5a059;
}

.nav-link.active {
  color: #ffffff;
  font-weight: 600;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #c5a059;
  border-radius: 1px;
}

.pro-badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: rgba(197, 160, 89, 0.15);
  color: #c5a059;
  border: 1px solid rgba(197, 160, 89, 0.4);
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 4px;
}

/* Actions à droite */
.navbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* Bouton Panier */
.cart-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.cart-btn:hover {
  color: #c5a059;
  border-color: rgba(197, 160, 89, 0.4);
  background: rgba(197, 160, 89, 0.1);
}

.cart-svg {
  width: 22px;
  height: 22px;
}

.cart-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  background-color: #e11d48;
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #0d0d0d;
}

.cart-badge.has-items {
  background-color: #d4af37;
  color: #0d0d0d;
}

/* Bouton Menu Mobile (Hamburger) */
.menu-toggle-btn {
  display: none;
  background: transparent;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.menu-toggle-btn:hover {
  color: #c5a059;
}

/* Tiroir Mobile */
.mobile-nav-drawer {
  display: none;
  background-color: #121212;
  border-bottom: 1px solid rgba(197, 160, 89, 0.2);
  padding: 16px 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
}

.mobile-nav-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #d0d0d0;
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  padding: 12px 14px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mobile-nav-link:hover,
.mobile-nav-link.active {
  background-color: rgba(197, 160, 89, 0.12);
  color: #c5a059;
}

.mobile-link-icon {
  font-size: 1.15rem;
}

.mobile-cart-badge {
  margin-left: auto;
  font-size: 0.78rem;
  font-weight: 600;
  background: rgba(212, 175, 55, 0.2);
  color: #d4af37;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.4);
}

.mobile-nav-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 6px 0;
}

.mobile-nav-link.staff-link {
  color: #999;
  font-size: 0.9rem;
}

.mobile-nav-link.staff-link:hover {
  color: #fff;
}

/* Animations Tiroir */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: all 0.25s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Responsive Mobile (< 768px) */
@media (max-width: 768px) {
  .navbar-container {
    height: 64px;
    padding: 0 16px;
  }

  .brand-text {
    font-size: 1.35rem;
  }

  /* Cacher la navigation desktop */
  .desktop-nav {
    display: none;
  }

  /* Afficher le bouton hamburger */
  .menu-toggle-btn {
    display: inline-flex;
  }

  /* Activer le tiroir mobile */
  .mobile-nav-drawer {
    display: block;
  }

  .cart-btn {
    padding: 6px 10px;
    background: rgba(197, 160, 89, 0.12);
    border-color: rgba(197, 160, 89, 0.35);
  }
}
</style>