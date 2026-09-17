<script setup>
import MobileFloatingCart from '@/components/MobileFloatingCart.vue'
</script>

<template>
  <div id="restaurant-app">
    <main class="main-content">
      <router-view :key="$route.fullPath" />
    </main>

    <!-- Barre de Panier Flottante sur Mobile (apparaît dès qu'un plat est ajouté) -->
    <MobileFloatingCart />
  </div>
</template>

<style scoped>
#restaurant-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}
</style>