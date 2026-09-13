<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import vinPoster from '@/assets/images/event_vin.jpg'
import karaokePoster from '@/assets/images/event_karaoke.jpg'

const selectedPoster = ref(null)

const events = [
  {
    id: 'vin',
    title: 'Soirée Dégustation Royale',
    description: "Une immersion sensorielle dans la haute gastronomie avec la dégustation gratuite et exclusive de notre nouveau vin d'exception introduit au restaurant.",
    image: vinPoster
  },
  {
    id: 'karaoke',
    title: 'Soirée Karaoké & Cocktails',
    description: "Chantez vos titres préférés et profitez d'une ambiance festive unique accompagnée de nos cocktails signatures et délices afro-gourmets.",
    image: karaokePoster
  }
]

const openPoster = (event) => {
  selectedPoster.value = event
  document.body.style.overflow = 'hidden'
}

const closePoster = () => {
  selectedPoster.value = null
  document.body.style.overflow = ''
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape' && selectedPoster.value) {
    closePoster()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  document.body.style.overflow = ''
})
</script>

<template>
  <section class="promotions-section">
    <!-- En-tête conforme à la capture -->
    <div class="promotions-header">
      <h2 class="promotions-title">Promotions & Événements</h2>
      <div class="gold-divider"></div>
    </div>

    <!-- Grille de 2 cartes côte à côte -->
    <div class="events-grid">
      <article 
        v-for="event in events" 
        :key="event.id" 
        class="event-card"
      >
        <!-- Image cliquable avec effet hover et badge d'agrandissement -->
        <div 
          class="image-wrapper" 
          @click="openPoster(event)"
          role="button"
          tabindex="0"
          :aria-label="`Agrandir l'affiche : ${event.title}`"
          @keydown.enter="openPoster(event)"
        >
          <img :src="event.image" :alt="event.title" class="event-image" loading="lazy" />
          <div class="image-overlay">
            <span class="zoom-badge">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              Agrandir l'affiche
            </span>
          </div>
        </div>

        <!-- Corps de la carte -->
        <div class="card-body">
          <h3 class="card-title">{{ event.title }}</h3>
          <p class="card-description">{{ event.description }}</p>
        </div>
      </article>
    </div>

    <!-- Modale plein écran (Lightbox) pour afficher l'affiche dans son entièreté -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div 
          v-if="selectedPoster" 
          class="modal-backdrop" 
          @click="closePoster"
          role="dialog"
          aria-modal="true"
        >
          <div class="modal-dialog" @click.stop>
            <button 
              class="btn-close-modal" 
              @click="closePoster" 
              aria-label="Fermer l'affiche"
            >
              ✕
            </button>
            
            <div class="modal-image-container">
              <img 
                :src="selectedPoster.image" 
                :alt="selectedPoster.title" 
                class="modal-full-image" 
              />
            </div>

            <div class="modal-caption">
              <h4>{{ selectedPoster.title }}</h4>
              <p>Cliquez à l'extérieur ou appuyez sur Échap pour fermer</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.promotions-section {
  max-width: 1200px;
  margin: 70px auto;
  padding: 0 20px;
}

/* En-tête centré avec séparateur doré */
.promotions-header {
  text-align: center;
  margin-bottom: 40px;
}

.promotions-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2.6rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 16px 0;
  letter-spacing: 0.5px;
}

.gold-divider {
  width: 65px;
  height: 3px;
  background-color: #d4af37;
  margin: 0 auto;
  border-radius: 2px;
}

/* Grille 2 colonnes */
.events-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

/* Carte événement */
.event-card {
  background-color: #121212;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.event-card:hover {
  transform: translateY(-4px);
  border-color: rgba(212, 175, 55, 0.4);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
}

/* Conteneur d'image cliquable */
.image-wrapper {
  position: relative;
  width: 100%;
  height: 280px;
  overflow: hidden;
  cursor: pointer;
  background-color: #0b0b0b;
}

.event-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  transition: transform 0.5s ease;
}

.event-card:hover .event-image {
  transform: scale(1.04);
}

/* Overlay au survol */
.image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.2) 60%, transparent 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-wrapper:hover .image-overlay,
.image-wrapper:focus .image-overlay {
  opacity: 1;
}

.zoom-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(13, 13, 13, 0.85);
  color: #d4af37;
  border: 1px solid rgba(212, 175, 55, 0.5);
  padding: 8px 18px;
  border-radius: 30px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  backdrop-filter: blur(6px);
  transform: translateY(6px);
  transition: transform 0.3s ease;
}

.image-wrapper:hover .zoom-badge {
  transform: translateY(0);
}

/* Corps de texte de la carte */
.card-body {
  padding: 24px 28px 30px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.card-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #d4af37;
  margin: 0 0 12px 0;
  letter-spacing: 0.3px;
}

.card-description {
  color: #a0a0a0;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0;
}

/* ===================================================
   Lightbox / Modale pour afficher l'affiche entière
   =================================================== */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background-color: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-dialog {
  position: relative;
  max-width: 90vw;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: scaleUp 0.3s ease-out;
}

.btn-close-modal {
  position: absolute;
  top: -45px;
  right: 0;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #ffffff;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.btn-close-modal:hover {
  background-color: #d4af37;
  color: #0d0d0d;
  transform: scale(1.08);
}

.modal-image-container {
  max-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-full-image {
  max-height: 80vh;
  max-width: 90vw;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85);
}

.modal-caption {
  margin-top: 14px;
  text-align: center;
}

.modal-caption h4 {
  font-family: 'Playfair Display', Georgia, serif;
  color: #d4af37;
  font-size: 1.25rem;
  margin: 0 0 4px 0;
}

.modal-caption p {
  color: #777777;
  font-size: 0.85rem;
  margin: 0;
}

/* Animations transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@keyframes scaleUp {
  from {
    transform: scale(0.94);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .promotions-title {
    font-size: 2rem;
  }
  .events-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .image-wrapper {
    height: 240px;
  }
  .btn-close-modal {
    top: -40px;
    right: 4px;
  }
}
</style>
