<template>
  <footer class="footer">
    <div class="container footer-content">
      <!-- 1. Nom de l'établissement -->
      <h3 class="footer-title">Le Premium</h3>

      <!-- 2. Horaires d'ouverture -->
      <p class="footer-schedule">Mardi à Dimanche : 18h00 - 01h00</p>

      <!-- 3. Numéro de téléphone -->
      <p class="footer-phone">+226 00 00 00 00</p>

      <!-- 4. Signature & Copyright -->
      <p class="footer-copyright">
        © 2024 Le Premium. Elevated Afro-Gourmet Excellence.
      </p>
    </div>
  </footer>
</template>

<script setup>
// Composant Pied de page - Design Centré Haute Gastronomie
</script>

<style scoped>
.footer {
  background-color: #080808;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 4rem 1rem 3rem;
  margin-top: auto;
  text-align: center;
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.footer-title {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--primary-gold);
  margin-bottom: 1rem;
  letter-spacing: 0.5px;
}

.footer-schedule {
  color: #a3a3a3;
  font-size: 0.875rem;
  margin-bottom: 0.35rem;
  font-weight: 400;
}

.footer-phone {
  color: #a3a3a3;
  font-size: 0.875rem;
  margin-bottom: 2rem;
  font-weight: 400;
  letter-spacing: 0.5px;
}

.footer-copyright {
  color: #525252;
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.25px;
}
</style>