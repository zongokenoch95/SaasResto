<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  getCaisseCommandesEnAttente, 
  validerEncaissement, 
  getCuisineCommandesActives, 
  terminerCommandeCuisine 
} from '@/services/api'
import { getSocket, joinStaffRoom, isConnected as socketConnected } from '@/services/socket'
import { useAuthStore } from '@/stores/authStore'
import Navbar from '@/components/Navbar.vue'

const router = useRouter()
const authStore = useAuthStore()

// Si le profil connecté est Cuisine, onglet Cuisine par défaut
const activeTab = ref(authStore.role === 'cuisine' ? 'cuisine' : 'caisse')
const caisseOrders = ref([])
const cuisineOrders = ref([])
const isProcessing = ref(false)
const soundEnabled = ref(true)

let previousCaisseCount = 0
let pollTimer = null

// Déconnexion
const handleLogout = async () => {
  await authStore.logout()
  router.push('/restaurant/login')
}

// Émission d'un son d'alerte Web Audio API lors d'une nouvelle commande caisse
const playNotificationSound = () => {
  if (!soundEnabled.value) return
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12) // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.36)
  } catch (err) {
    console.warn("Audio non autorisé ou non supporté:", err)
  }
}

// Calcul du temps restant pour une commande caisse
const getTimeLeft = (expiresAt) => {
  if (!expiresAt) return '10:00'
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
  if (diff <= 0) return 'Expiré'
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Rafraîchissement des données selon le rôle de l'utilisateur
const refreshData = async () => {
  try {
    const promises = []

    if (authStore.isCaisse) {
      promises.push(getCaisseCommandesEnAttente())
    } else {
      promises.push(Promise.resolve([]))
    }

    if (authStore.isCuisine) {
      promises.push(getCuisineCommandesActives())
    } else {
      promises.push(Promise.resolve([]))
    }

    const [caisseData, cuisineData] = await Promise.all(promises)

    // Si une nouvelle commande en attente arrive, sonner l'alerte
    if (caisseData.length > previousCaisseCount && previousCaisseCount !== 0) {
      playNotificationSound()
    }
    previousCaisseCount = caisseData.length

    caisseOrders.value = caisseData || []
    cuisineOrders.value = cuisineData || []
  } catch (err) {
    console.error("Erreur polling dashboard:", err)
    if (err.message && (err.message.includes('Token') || err.message.includes('Session') || err.message.includes('401'))) {
      await authStore.logout()
      router.push('/restaurant/login')
    }
  }
}

// Helpers pour les opérateurs Mobile Money (Orange, Moov, Wave)
const getOpBadgeText = (method) => {
  if (method === 'moov_money') return '🔵 Moov'
  if (method === 'wave') return '🌊 Wave'
  return '🟠 Orange'
}

const getOpLabel = (method) => {
  if (method === 'moov_money') return 'Moov Money'
  if (method === 'wave') return 'Wave'
  return 'Orange Money'
}

// Carillon d'annonce Web Audio API pour la Cuisine KDS (accord 3 tons)
const playKitchenChimeSound = () => {
  if (!soundEnabled.value) return
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const playTone = (freq, delay, dur) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + dur)
    }

    playTone(523.25, 0, 0.18)      // Do5
    playTone(659.25, 0.12, 0.18)   // Mi5
    playTone(783.99, 0.24, 0.35)   // Sol5
  } catch (err) {
    console.warn("Audio non autorisé ou non supporté:", err)
  }
}

// Action Caisse : Valider l'encaissement Mobile Money
const handleValiderEncaissement = async (orderId) => {
  if (!confirm("Avez-vous bien vérifié la réception des fonds sur votre application de paiement (Orange Max it, SMS Moov ou Wave Business) ?")) {
    return
  }

  isProcessing.value = true
  try {
    await validerEncaissement(orderId)
    await refreshData()
  } catch (err) {
    alert("Erreur lors de la validation: " + err.message)
  } finally {
    isProcessing.value = false
  }
}

// Action Cuisine : Terminer la préparation
const handleTerminerCuisine = async (orderId) => {
  isProcessing.value = true
  try {
    await terminerCommandeCuisine(orderId)
    await refreshData()
  } catch (err) {
    alert("Erreur: " + err.message)
  } finally {
    isProcessing.value = false
  }
}

// Gestionnaires d'événements temps réel WebSocket
let socket = null

const handleRealtimeOrderCreated = (order) => {
  if (!order) return
  if (authStore.isCaisse) {
    if (!caisseOrders.value.some(o => o.id === order.id)) {
      caisseOrders.value.unshift(order)
      playNotificationSound()
    }
  }
}

const handleRealtimePaymentUpdated = (order) => {
  if (!order) return
  const idx = caisseOrders.value.findIndex(o => o.id === order.id)
  if (idx !== -1) {
    caisseOrders.value[idx] = { ...caisseOrders.value[idx], ...order }
  }
}

const handleRealtimeOrderCancelled = (order) => {
  if (!order) return
  caisseOrders.value = caisseOrders.value.filter(o => o.id !== order.id)
}

const handleRealtimeOrderExpired = ({ id }) => {
  caisseOrders.value = caisseOrders.value.filter(o => o.id !== id)
}

const handleRealtimeOrderValidated = (order) => {
  if (!order) return
  // Retirer de la caisse
  caisseOrders.value = caisseOrders.value.filter(o => o.id !== order.id)

  // Ajouter à la cuisine
  if (authStore.isCuisine) {
    if (!cuisineOrders.value.some(o => o.id === order.id)) {
      cuisineOrders.value.unshift(order)
      playKitchenChimeSound()
    }
  }
}

const handleRealtimeOrderReady = (order) => {
  if (!order) return
  cuisineOrders.value = cuisineOrders.value.filter(o => o.id !== order.id)
}

onMounted(() => {
  refreshData()

  // Connexion WebSocket
  joinStaffRoom(authStore.role)
  socket = getSocket()

  socket.on('order:created', handleRealtimeOrderCreated)
  socket.on('order:new', handleRealtimeOrderCreated)
  socket.on('order:payment_updated', handleRealtimePaymentUpdated)
  socket.on('order:cancelled', handleRealtimeOrderCancelled)
  socket.on('order:expired', handleRealtimeOrderExpired)
  socket.on('order:caisse_validated', (order) => {
    caisseOrders.value = caisseOrders.value.filter(o => o.id !== order.id)
  })
  socket.on('order:validated', handleRealtimeOrderValidated)
  socket.on('order:ready', handleRealtimeOrderReady)
  socket.on('order:cuisine_ready', handleRealtimeOrderReady)

  // Polling de secours dégradé (toutes les 10s)
  pollTimer = setInterval(refreshData, 10000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (socket) {
    socket.off('order:created', handleRealtimeOrderCreated)
    socket.off('order:new', handleRealtimeOrderCreated)
    socket.off('order:payment_updated', handleRealtimePaymentUpdated)
    socket.off('order:cancelled', handleRealtimeOrderCancelled)
    socket.off('order:expired', handleRealtimeOrderExpired)
    socket.off('order:caisse_validated')
    socket.off('order:validated', handleRealtimeOrderValidated)
    socket.off('order:ready', handleRealtimeOrderReady)
    socket.off('order:cuisine_ready', handleRealtimeOrderReady)
  }
})
</script>

<template>
  <div class="dashboard-page">
    <Navbar />

    <div class="dashboard-wrapper">
      <!-- Barre d'outils supérieure du restaurant -->
      <header class="dashboard-header">
        <div class="header-titles">
          <h1>Dashboard Restaurant</h1>
          <span class="live-badge" :class="{ 'live-active': socketConnected, 'live-fallback': !socketConnected }">
            <template v-if="socketConnected">⚡ En direct (WebSocket)</template>
            <template v-else>● Mode secours (Polling)</template>
          </span>
        </div>

        <div class="header-controls">
          <!-- Session utilisateur & Déconnexion -->
          <div class="user-session-bar">
            <span class="user-role-badge" :class="authStore.role">
              <span class="role-icon">{{ authStore.role === 'caisse' ? '🟠' : authStore.role === 'cuisine' ? '👨‍🍳' : '👑' }}</span>
              {{ authStore.userName }}
            </span>
            <button @click="handleLogout" class="btn-logout" title="Déconnexion du restaurant">
              Quitter ⏻
            </button>
          </div>

          <button 
            v-if="authStore.isCaisse || authStore.isCuisine"
            class="btn-audio-toggle" 
            :class="{ active: soundEnabled }"
            @click="soundEnabled = !soundEnabled"
          >
            {{ soundEnabled ? '🔔 Alertes' : '🔕 Coupé' }}
          </button>

          <!-- Onglets Caisse vs Cuisine (selon permissions) -->
          <div class="tabs-switcher">
            <button 
              v-if="authStore.isCaisse"
              class="tab-btn" 
              :class="{ active: activeTab === 'caisse' }"
              @click="activeTab = 'caisse'"
            >
              🟠 Caisse (Mobile Money)
              <span v-if="caisseOrders.length > 0" class="tab-badge pulse">
                {{ caisseOrders.length }}
              </span>
            </button>

            <button 
              v-if="authStore.isCuisine"
              class="tab-btn" 
              :class="{ active: activeTab === 'cuisine' }"
              @click="activeTab = 'cuisine'"
            >
              👨‍🍳 Cuisine (KDS)
              <span v-if="cuisineOrders.length > 0" class="tab-badge">
                {{ cuisineOrders.length }}
              </span>
            </button>
          </div>
        </div>
      </header>

      <!-- VUE 1 : CAISSE (ENCAISSEMENT ORANGE MONEY) -->
      <section v-if="activeTab === 'caisse'" class="tab-content">
        <div class="caisse-intro-bar">
          <div class="caisse-help">
            <strong>Procédure Caissier :</strong>
            <span>1. Repérez l'opérateur (Orange Money, Moov Money ou Wave) et le montant. 2. Contrôlez la réception des fonds (Orange Max it, SMS Moov, App Wave). 3. Cliquez sur <em>Valider l'encaissement</em>.</span>
          </div>
        </div>

        <div v-if="caisseOrders.length === 0" class="empty-state">
          <span class="empty-icon">✓</span>
          <h3>Aucun paiement en attente</h3>
          <p>Toutes les commandes ont été traitées ou les fonds encaissés.</p>
        </div>

        <div v-else class="orders-grid">
          <div 
            v-for="order in caisseOrders" 
            :key="order.id"
            class="order-card caisse-card"
          >
            <div class="card-top">
              <div class="table-and-op">
                <span class="table-tag">TABLE N°{{ order.tableNumber }}</span>
                <span class="op-badge" :class="order.modePaiement || order.mode_paiement || 'orange_money'">
                  {{ getOpBadgeText(order.modePaiement || order.mode_paiement) }}
                </span>
              </div>
              <span class="timer-tag" :class="{ danger: getTimeLeft(order.expiresAt) < '03:00' }">
                ⏳ {{ getTimeLeft(order.expiresAt) }}
              </span>
            </div>

            <div class="client-box">
              <h3 class="client-name">{{ order.customerName }}</h3>
              <p class="client-phone">
                📞 {{ getOpLabel(order.modePaiement || order.mode_paiement) }}: <strong>{{ order.numeroClient || order.customerPhone || 'Non renseigné' }}</strong>
              </p>
              <span class="order-id">#{{ order.id }}</span>
            </div>

            <div class="items-preview">
              <div v-for="it in order.items" :key="it.id || it.product?.id" class="item-line">
                <span>{{ it.quantity }}× {{ it.product?.name || it.name }}</span>
                <span>{{ (((it.price || it.product?.price || 0) * (it.quantity || 1))).toLocaleString() }} F</span>
              </div>
            </div>

            <div v-if="order.specialNotes" class="note-box">
              <em>Note :</em> {{ order.specialNotes }}
            </div>

            <div class="card-bottom">
              <div class="total-badge">
                <span class="lbl">TOTAL À ENCAISSER</span>
                <span class="val">{{ (order.montantTotal || order.total || 0).toLocaleString() }} FCFA</span>
              </div>

              <button 
                class="btn-valider"
                :disabled="isProcessing"
                @click="handleValiderEncaissement(order.id)"
              >
                ✓ Valider l'encaissement (Max it)
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- VUE 2 : CUISINE (KDS - EN PREPARATION) -->
      <section v-if="activeTab === 'cuisine'" class="tab-content">
        <div v-if="cuisineOrders.length === 0" class="empty-state">
          <span class="empty-icon">🍽️</span>
          <h3>Cuisine à jour</h3>
          <p>Aucun plat en cours de préparation. Les bons de commande payés apparaîtront ici automatiquement.</p>
        </div>

        <div v-else class="orders-grid">
          <div 
            v-for="order in cuisineOrders" 
            :key="order.id"
            class="order-card cuisine-card"
          >
            <div class="card-top">
              <span class="table-tag big-table">TABLE N°{{ order.tableNumber }}</span>
              <span class="paid-verified-tag">PAYÉ ✓</span>
            </div>

            <div class="client-info-cuisine">
              <span>Client: <strong>{{ order.customerName }}</strong></span>
              <span class="order-time">{{ new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
            </div>

            <div class="kds-items-list">
              <div v-for="it in order.items" :key="it.id || it.product?.id" class="kds-item">
                <span class="kds-qty">x{{ it.quantity }}</span>
                <span class="kds-name">{{ it.product?.name || it.name }}</span>
              </div>
            </div>

            <div v-if="order.specialNotes" class="kds-alert-note">
              <strong>⚠️ Allergies / Remarque :</strong> {{ order.specialNotes }}
            </div>

            <button 
              class="btn-terminer"
              :disabled="isProcessing"
              @click="handleTerminerCuisine(order.id)"
            >
              Prêt à servir →
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  background-color: #0b0b0b;
  color: #fff;
  min-height: 100vh;
}

.dashboard-wrapper {
  max-width: 1300px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #222;
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.2rem;
}

.dashboard-header h1 {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  color: #d4af37;
  margin: 0 0 0.3rem 0;
}

.live-badge {
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
}

.live-badge.live-active {
  color: #2ecc71;
  background: rgba(46, 204, 113, 0.1);
  border: 1px solid rgba(46, 204, 113, 0.25);
}

.live-badge.live-fallback {
  color: #f39c12;
  background: rgba(243, 156, 18, 0.1);
  border: 1px solid rgba(243, 156, 18, 0.25);
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  flex-wrap: wrap;
}

.btn-audio-toggle {
  background: #181818;
  border: 1px solid #333;
  color: #aaa;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-audio-toggle.active {
  color: #d4af37;
  border-color: rgba(212, 175, 55, 0.4);
}

.tabs-switcher {
  display: flex;
  background: #161616;
  border: 1px solid #282828;
  border-radius: 8px;
  padding: 4px;
}

.tab-btn {
  background: transparent;
  border: none;
  color: #888;
  padding: 0.65rem 1.2rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #252525;
  color: #fff;
}

.tab-badge {
  background: #d4af37;
  color: #000;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
}

.tab-badge.pulse {
  background: #ff6600;
  color: #fff;
  animation: pulseBadge 1.2s infinite;
}

@keyframes pulseBadge {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.caisse-intro-bar {
  background: #19140d;
  border: 1px solid rgba(255, 102, 0, 0.3);
  padding: 0.8rem 1.2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  color: #ff9933;
  font-size: 0.85rem;
}

.caisse-help strong {
  color: #ff6600;
  margin-right: 0.4rem;
}

.empty-state {
  text-align: center;
  padding: 5rem 1rem;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #aaa;
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
}

.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.5rem;
}

.order-card {
  background: #141414;
  border: 1px solid #282828;
  border-radius: 10px;
  padding: 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.caisse-card {
  border-top: 4px solid #ff6600;
}

.cuisine-card {
  border-top: 4px solid #2ecc71;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-and-op {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-tag {
  background-color: #d4af37;
  color: #000;
  font-weight: 800;
  padding: 0.3rem 0.7rem;
  border-radius: 4px;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
}

.op-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.op-badge.orange_money {
  background: rgba(255, 121, 0, 0.15);
  color: #ff7900;
  border: 1px solid rgba(255, 121, 0, 0.4);
}

.op-badge.moov_money {
  background: rgba(0, 102, 179, 0.18);
  color: #3399ff;
  border: 1px solid rgba(0, 102, 179, 0.4);
}

.op-badge.wave {
  background: rgba(29, 195, 244, 0.18);
  color: #1dc3f4;
  border: 1px solid rgba(29, 195, 244, 0.4);
}

.big-table {
  font-size: 1.05rem;
  padding: 0.4rem 0.9rem;
}

.timer-tag {
  background: #1f1f1f;
  color: #aaa;
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  font-family: monospace;
}

.timer-tag.danger {
  background: #3d1414;
  color: #ff6666;
  font-weight: bold;
}

.paid-verified-tag {
  background: #173824;
  color: #2ecc71;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
}

.client-box h3 {
  margin: 0 0 0.3rem 0;
  font-size: 1.2rem;
  color: #fff;
}

.client-phone {
  color: #ffaa00;
  font-size: 0.95rem;
  margin: 0 0 0.3rem 0;
}

.order-id {
  font-size: 0.75rem;
  color: #666;
}

.items-preview {
  background: #1a1a1a;
  padding: 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.item-line {
  display: flex;
  justify-content: space-between;
  color: #ccc;
}

.note-box {
  background: #2b1f14;
  color: #ffbb66;
  font-size: 0.8rem;
  padding: 0.5rem 0.8rem;
  border-radius: 4px;
  border-left: 3px solid #ff9900;
}

.card-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.total-badge {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-top: 1px solid #222;
  padding-top: 0.8rem;
}

.total-badge .lbl {
  font-size: 0.75rem;
  color: #888;
}

.total-badge .val {
  font-size: 1.4rem;
  font-weight: bold;
  color: #ff6600;
  font-family: 'Playfair Display', serif;
}

.btn-valider {
  width: 100%;
  background: #27ae60;
  color: #fff;
  border: none;
  padding: 0.85rem;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-valider:hover:not(:disabled) {
  background: #219653;
}

.client-info-cuisine {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #bbb;
}

.order-time {
  color: #777;
  font-size: 0.8rem;
}

.kds-items-list {
  background: #181818;
  padding: 1rem;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.kds-item {
  display: flex;
  gap: 0.8rem;
  font-size: 1.05rem;
}

.kds-qty {
  color: #d4af37;
  font-weight: 800;
}

.kds-name {
  color: #fff;
}

.kds-alert-note {
  background: #381515;
  color: #ff8888;
  padding: 0.6rem 0.8rem;
  border-radius: 4px;
  font-size: 0.85rem;
  border-left: 3px solid #e74c3c;
}

.btn-terminer {
  margin-top: auto;
  background: #2ecc71;
  color: #0b0b0b;
  border: none;
  padding: 0.85rem;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-terminer:hover:not(:disabled) {
  background: #27ae60;
  color: #fff;
}

/* Styles Session Utilisateur & Déconnexion */
.user-session-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #181818;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.user-role-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #eee;
}

.user-role-badge.caisse {
  color: #ff9800;
}

.user-role-badge.cuisine {
  color: #4caf50;
}

.user-role-badge.admin {
  color: #d4af37;
}

.btn-logout {
  background: rgba(230, 57, 70, 0.15);
  border: 1px solid rgba(230, 57, 70, 0.3);
  color: #ff6b6b;
  font-size: 0.78rem;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-logout:hover {
  background: #e63946;
  color: #fff;
}
</style>
