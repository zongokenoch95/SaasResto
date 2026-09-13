<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orderStore'
import QRCode from 'qrcode'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()

const orderId = computed(() => route.params.id)
const order = ref(null)
const isLoading = ref(true)
const isCancelling = ref(false)
const qrCodeDataUrl = ref('')
const copied = ref(false)

// Code marchand Orange Money Burkina (configurable)
const CODE_MARCHAND = '654321'

// Minuteur TTL
const timeLeftSeconds = ref(600)
let timerInterval = null
let pollingInterval = null

// Schémas USSD Orange Money
const ussdCode = computed(() => {
  const amount = order.value?.montantTotal || order.value?.total || 0
  return `*144*4*6*${CODE_MARCHAND}*${amount}#`
})

const ussdTelUrl = computed(() => {
  const amount = order.value?.montantTotal || order.value?.total || 0
  return `tel:*144*4*6*${CODE_MARCHAND}*${amount}%23`
})

// Formatage du compte à rebours MM:SS
const formattedTime = computed(() => {
  const mins = Math.floor(Math.max(0, timeLeftSeconds.value) / 60)
  const secs = Math.max(0, timeLeftSeconds.value) % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const isExpired = computed(() => {
  return timeLeftSeconds.value <= 0 || order.value?.statut === 'ANNULEE_EXPIREE'
})

const isCancelled = computed(() => {
  return order.value?.statut === 'ANNULEE_PAR_CLIENT'
})

// Génération du QR Code pour écran Desktop
const generateQrCode = async () => {
  try {
    qrCodeDataUrl.value = await QRCode.toDataURL(ussdTelUrl.value, {
      width: 240,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error("Erreur génération QR Code:", err)
  }
}

// Polling toutes les 3 secondes
const checkStatus = async () => {
  if (isExpired.value || isCancelled.value) return

  const data = await orderStore.fetchOrderStatus(orderId.value)
  if (data) {
    order.value = data

    // Si la commande a été validée par la caisse
    if (data.statut === 'PAYEE' || data.statut === 'EN_PREPARATION') {
      clearInterval(pollingInterval)
      clearInterval(timerInterval)
      router.push(`/confirmation/${orderId.value}`)
    }
  }
}

// Calcul du temps restant basé sur expiresAt
const updateCountdown = () => {
  if (!order.value?.expiresAt) return

  const expiresTime = new Date(order.value.expiresAt).getTime()
  const now = Date.now()
  const diff = Math.floor((expiresTime - now) / 1000)
  timeLeftSeconds.value = Math.max(0, diff)

  if (timeLeftSeconds.value <= 0) {
    if (order.value) order.value.statut = 'ANNULEE_EXPIREE'
    clearInterval(timerInterval)
    clearInterval(pollingInterval)
  }
}

// Copier le code USSD dans le presse-papier
const copyUssd = async () => {
  try {
    await navigator.clipboard.writeText(ussdCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    console.error("Impossible de copier:", err)
  }
}

// Annulation par le client
const handleCancel = async () => {
  if (!confirm("Voulez-vous vraiment annuler cette commande ? Les articles seront remis en stock.")) {
    return
  }

  isCancelling.value = true
  try {
    await orderStore.cancelOrder(orderId.value)
    if (order.value) order.value.statut = 'ANNULEE_PAR_CLIENT'
    clearInterval(pollingInterval)
    clearInterval(timerInterval)
  } catch (err) {
    alert("Erreur lors de l'annulation: " + err.message)
  } finally {
    isCancelling.value = false
  }
}

onMounted(async () => {
  isLoading.value = true
  const initialData = await orderStore.fetchOrderStatus(orderId.value)
  order.value = initialData
  isLoading.value = false

  if (order.value) {
    updateCountdown()
    await generateQrCode()

    // Si déjà validé
    if (order.value.statut === 'PAYEE' || order.value.statut === 'EN_PREPARATION') {
      router.push(`/confirmation/${orderId.value}`)
      return
    }

    // Minuteur chaque seconde
    timerInterval = setInterval(updateCountdown, 1000)

    // Polling toutes les 3 secondes (spécification CONTEXT.md)
    pollingInterval = setInterval(checkStatus, 3000)
  }
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (pollingInterval) clearInterval(pollingInterval)
})
</script>

<template>
  <div class="payment-page">
    <Navbar />

    <main class="payment-container">
      <!-- État Chargement -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Initialisation de votre paiement Orange Money...</p>
      </div>

      <!-- État Expiré -->
      <div v-else-if="isExpired" class="status-card error-card">
        <div class="status-icon">⏳</div>
        <h2>Délai de paiement dépassé</h2>
        <p>Le délai de 10 minutes est écoulé. Votre commande a été automatiquement annulée et les articles ont été remis en stock.</p>
        <router-link to="/menu" class="btn-primary">Retourner au menu</router-link>
      </div>

      <!-- État Annulé par le Client -->
      <div v-else-if="isCancelled" class="status-card warning-card">
        <div class="status-icon">🚫</div>
        <h2>Commande Annulée</h2>
        <p>Vous avez annulé votre commande. Aucun débit n'a été effectué et vos plats ont été remis à la disposition du restaurant.</p>
        <router-link to="/menu" class="btn-primary">Consulter à nouveau la carte</router-link>
      </div>

      <!-- Interface de Paiement Active -->
      <div v-else-if="order" class="payment-card">
        <!-- En-tête & Minuteur TTL -->
        <div class="payment-header">
          <div class="brand-om">
            <span class="om-circle">🟠</span>
            <div>
              <h3>Paiement Orange Money Burkina</h3>
              <p class="ref-order">Réf: #{{ order.id || order.orderId }} · Table n°{{ order.tableNumber }}</p>
            </div>
          </div>

          <div class="countdown-box" :class="{ 'warning-time': timeLeftSeconds < 180 }">
            <span class="countdown-label">TEMPS RESTANT</span>
            <span class="countdown-value">{{ formattedTime }}</span>
          </div>
        </div>

        <!-- Montant à payer -->
        <div class="amount-banner">
          <span class="amount-label">Montant total à payer :</span>
          <span class="amount-value">{{ (order.montantTotal || order.total || 0).toLocaleString() }} FCFA</span>
        </div>

        <!-- Instructions du paiement No-Aggregator -->
        <div class="payment-methods-grid">
          <!-- Option Mobile : Bouton direct tel:*144...# -->
          <div class="method-card mobile-method">
            <span class="badge-step">Option 1 · Sur votre Smartphone</span>
            <h4>Lancement direct du composeur USSD</h4>
            <p>Cliquez sur le bouton ci-dessous pour ouvrir automatiquement le code marchand dans votre application Téléphone :</p>
            
            <a :href="ussdTelUrl" class="btn-ussd-call">
              <span class="phone-icon">📞</span>
              <span>Composer {{ ussdCode }}</span>
            </a>

            <div class="ussd-manual">
              <span>Ou composez manuellement :</span>
              <div class="code-box">
                <code>{{ ussdCode }}</code>
                <button @click="copyUssd" class="btn-copy">
                  {{ copied ? 'Copié ✓' : 'Copier' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Option Desktop : Scan QR Code -->
          <div class="method-card desktop-method">
            <span class="badge-step">Option 2 · Depuis un Ordinateur</span>
            <h4>Scannez avec votre téléphone</h4>
            <p>Pointez l'appareil photo de votre smartphone pour déclencher immédiatement l'appel USSD :</p>

            <div class="qr-container" v-if="qrCodeDataUrl">
              <img :src="qrCodeDataUrl" alt="QR Code Paiement Orange Money" class="qr-image" />
            </div>

            <span class="qr-hint">Compose directement le code marchand sécurisé</span>
          </div>
        </div>

        <!-- Attente active & Polling Indicator -->
        <div class="polling-indicator">
          <div class="pulsing-dot"></div>
          <div class="polling-text">
            <strong>Attente de validation par la caisse...</strong>
            <span>La caisse contrôle l'arrivée des fonds et valide votre commande. Cette page s'actualisera toute seule.</span>
          </div>
        </div>

        <!-- Actions secondaires : Annulation -->
        <div class="payment-actions">
          <button 
            @click="handleCancel" 
            class="btn-cancel" 
            :disabled="isCancelling"
          >
            {{ isCancelling ? 'Annulation en cours...' : '✕ Annuler la commande (libérer le stock)' }}
          </button>
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.payment-page {
  background-color: #0d0d0d;
  color: #fff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.payment-container {
  flex: 1;
  max-width: 900px;
  width: 100%;
  margin: 2.5rem auto;
  padding: 0 1.2rem;
}

.loading-state {
  text-align: center;
  padding: 5rem 1rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(212, 175, 55, 0.2);
  border-top-color: #d4af37;
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-card {
  background-color: #141414;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  max-width: 600px;
  margin: 3rem auto;
  border: 1px solid #282828;
}

.status-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.status-card h2 {
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem;
  margin-bottom: 0.8rem;
}

.status-card p {
  color: #aaa;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.error-card {
  border-color: rgba(231, 76, 60, 0.4);
}

.error-card h2 {
  color: #e74c3c;
}

.warning-card {
  border-color: rgba(243, 156, 18, 0.4);
}

.warning-card h2 {
  color: #f39c12;
}

.btn-primary {
  display: inline-block;
  background-color: #d4af37;
  color: #000;
  font-weight: bold;
  padding: 0.8rem 1.8rem;
  border-radius: 4px;
  text-decoration: none;
}

/* Carte de paiement principale */
.payment-card {
  background-color: #141414;
  border: 1px solid #282828;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #222;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
}

.brand-om {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.om-circle {
  font-size: 2.2rem;
}

.brand-om h3 {
  font-size: 1.25rem;
  color: #ff6600;
  margin: 0 0 0.2rem 0;
  font-weight: bold;
}

.ref-order {
  color: #888;
  font-size: 0.85rem;
  margin: 0;
}

.countdown-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #1a1a1a;
  border: 1px solid #333;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
}

.countdown-box.warning-time {
  border-color: #e74c3c;
  background-color: #2c1a1a;
}

.countdown-box.warning-time .countdown-value {
  color: #e74c3c;
  animation: blink 1s infinite;
}

@keyframes blink {
  50% { opacity: 0.5; }
}

.countdown-label {
  font-size: 0.7rem;
  color: #888;
  letter-spacing: 1px;
}

.countdown-value {
  font-size: 1.6rem;
  font-weight: bold;
  font-family: monospace;
  color: #d4af37;
}

.amount-banner {
  background: linear-gradient(135deg, #1f1408, #2a1b0b);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 8px;
  padding: 1.2rem 1.6rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.amount-label {
  color: #ccc;
  font-size: 1rem;
}

.amount-value {
  color: #d4af37;
  font-size: 2rem;
  font-weight: bold;
  font-family: 'Playfair Display', serif;
}

.payment-methods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.method-card {
  background-color: #191919;
  border: 1px solid #292929;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.badge-step {
  align-self: flex-start;
  background-color: rgba(255, 102, 0, 0.15);
  color: #ff6600;
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-weight: 600;
  margin-bottom: 0.8rem;
}

.method-card h4 {
  color: #fff;
  font-size: 1.1rem;
  margin: 0 0 0.5rem 0;
}

.method-card p {
  color: #999;
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: 1.2rem;
}

.btn-ussd-call {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background-color: #ff6600;
  color: #fff;
  text-decoration: none;
  font-weight: bold;
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  font-size: 1rem;
  transition: background-color 0.2s, transform 0.1s;
}

.btn-ussd-call:hover {
  background-color: #e65c00;
  transform: translateY(-2px);
}

.phone-icon {
  font-size: 1.2rem;
}

.ussd-manual {
  margin-top: 1.5rem;
  border-top: 1px solid #282828;
  padding-top: 1rem;
}

.ussd-manual span {
  font-size: 0.8rem;
  color: #888;
}

.code-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #111;
  border: 1px solid #333;
  padding: 0.5rem 0.8rem;
  border-radius: 4px;
  margin-top: 0.4rem;
}

.code-box code {
  color: #ffaa00;
  font-weight: bold;
  font-size: 0.95rem;
}

.btn-copy {
  background: transparent;
  border: 1px solid #555;
  color: #ccc;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-copy:hover {
  border-color: #d4af37;
  color: #d4af37;
}

.qr-container {
  background: #fff;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-self: center;
  margin: 0.5rem 0;
}

.qr-image {
  width: 190px;
  height: 190px;
  display: block;
}

.qr-hint {
  text-align: center;
  font-size: 0.75rem;
  color: #777;
  margin-top: 0.5rem;
}

/* Indicateur de polling */
.polling-indicator {
  background-color: #121815;
  border: 1px solid rgba(46, 204, 113, 0.3);
  padding: 1rem 1.4rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.pulsing-dot {
  width: 14px;
  height: 14px;
  background-color: #2ecc71;
  border-radius: 50%;
  box-shadow: 0 0 0 rgba(46, 204, 113, 0.4);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
  100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
}

.polling-text strong {
  display: block;
  color: #2ecc71;
  font-size: 0.95rem;
  margin-bottom: 0.2rem;
}

.polling-text span {
  color: #999;
  font-size: 0.85rem;
}

.payment-actions {
  display: flex;
  justify-content: center;
}

.btn-cancel {
  background: transparent;
  border: 1px solid rgba(231, 76, 60, 0.4);
  color: #ff8888;
  padding: 0.7rem 1.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover:not(:disabled) {
  background-color: rgba(231, 76, 60, 0.15);
  border-color: #e74c3c;
  color: #ff6666;
}

@media (max-width: 768px) {
  .payment-methods-grid {
    grid-template-columns: 1fr;
  }
  .payment-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
}
</style>
