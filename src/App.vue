<script setup>
// Composant racine de l'application
</script>

<template>
  <div id="restaurant-app">
    <main class="main-content">
      <router-view :key="$route.fullPath" />
    </main>
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