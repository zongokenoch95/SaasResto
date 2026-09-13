<script setup>
import { useCartStore } from '@/stores/cartStore'

const cartStore = useCartStore()
</script>

<template>
  <header class="navbar">
    <div class="container navbar-container">
      <router-link :to="{ name: 'Home' }" class="navbar-brand">
        <span class="brand-text">Le Premium</span>
      </router-link>

      <nav class="navbar-nav">
        <router-link :to="{ name: 'Home' }" class="nav-link" active-class="active">Home</router-link>
        <router-link :to="{ name: 'Menu' }" class="nav-link" active-class="active">Menu</router-link>
        <router-link :to="{ name: 'DashboardRestaurant' }" class="nav-link restaurant-nav-link" active-class="active">
          <span class="pro-badge">Staff</span> Restaurant
        </router-link>
      </nav>

      <div class="navbar-actions">
        <router-link :to="{ name: 'Cart' }" class="cart-btn" aria-label="Consulter mon panier">
          <svg class="cart-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span class="cart-badge" :class="{ 'has-items': cartStore.totalCount > 0 }">
            {{ cartStore.totalCount }}
          </span>
        </router-link>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: rgba(13, 13, 13, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.navbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.navbar-brand {
  text-decoration: none;
}

.brand-text {
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-size: 1.75rem;
  font-weight: 700;
  color: #c5a059;
}

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

.navbar-actions {
  display: flex;
  align-items: center;
}

.cart-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  padding: 0.5rem;
  transition: color 0.2s;
}

.cart-btn:hover {
  color: #c5a059;
}

.cart-svg {
  width: 24px;
  height: 24px;
}

.cart-badge {
  position: absolute;
  top: 0;
  right: -4px;
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
</style>