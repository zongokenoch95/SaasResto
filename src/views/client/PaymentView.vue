<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orderStore'
import { updateCommandePaymentMethod, getRestaurantByIdOrSlug } from '@/services/api'
import { getSocket, joinOrderRoom, leaveOrderRoom, isConnected as socketConnected } from '@/services/socket'
import QRCode from 'qrcode'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()

const orderId = computed(() => route.params.id)
const order = ref(null)
const restaurantInfo = ref(null)
const isLoading = ref(true)
const isCancelling = ref(false)
const qrCodeDataUrl = ref('')
const copied = ref(false)

// Détection des navigateurs intégrés aux réseaux sociaux (In-App WebViews : TikTok, Instagram, Facebook, etc.)
const userAgent = typeof window !== 'undefined' ? (window.navigator.userAgent || window.navigator.vendor || window.opera || '') : ''

const inAppName = computed(() => {
  const ua = userAgent
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook'
  if (/Instagram/i.test(ua)) return 'Instagram'
  if (/TikTok|musical_ly|Bytedance/i.test(ua)) return 'TikTok'
  if (/Snapchat/i.test(ua)) return 'Snapchat'
  if (/Twitter/i.test(ua)) return 'X (Twitter)'
  if (/Line/i.test(ua)) return 'Line'
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn'
  return 'Réseau Social'
})

// Vrai si ouvert dans Facebook, Instagram, TikTok, etc.
const isInAppBrowser = computed(() => {
  return /FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|Bytedance|Snapchat|Twitter|Line|LinkedInApp/i.test(userAgent)
})

// Détection OS pour solutions spécifiques
const isAndroid = computed(() => {
  return /Android/i.test(userAgent)
})

const isIOS = computed(() => {
  return /iPhone|iPad|iPod/i.test(userAgent)
})

// Deep-link Chrome Intent (Solution C) pour ouvrir Google Chrome sous Android
const chromeIntentUrl = computed(() => {
  if (typeof window === 'undefined') return '#'
  const urlWithoutProtocol = window.location.href.replace(/^https?:\/\//, '')
  return `intent://${urlWithoutProtocol}#Intent;scheme=https;package=com.android.chrome;end`
})

const hasAutoTriggeredDialer = ref(false)

// Forcer l'ouverture de l'application Téléphone (navigateurs smartphones standards)
const forceOpenDialer = () => {
  if (!currentActionUrl.value || currentActionUrl.value === '#' || currentActionUrl.value.startsWith('http')) return
  try {
    window.location.href = currentActionUrl.value
  } catch (err) {
    console.error("Erreur ouverture application téléphone:", err)
  }
}

// Déclenchement automatique pour navigateurs smartphones classiques
const triggerAutoDialerIfBrowser = () => {
  if (!isInAppBrowser.value && currentOperator.value?.type === 'ussd' && !hasAutoTriggeredDialer.value) {
    hasAutoTriggeredDialer.value = true
    forceOpenDialer()
  }
}

// Configuration Multi-Opérateurs Mobile Money dynamique (Multi-Tenant)
// Configuration Multi-Opérateurs Mobile Money dynamique (Multi-Tenant)
const dynamicOperatorConfig = computed(() => {
  const restoName = restaurantInfo.value?.name || 'RestoPremium'
  const typeCompteOM = (restaurantInfo.value?.type_compte_om || 'CLASSIQUE').toUpperCase()
  const isOmMarchand = typeCompteOM === 'MARCHAND'
  const orangeMerchantCode = restaurantInfo.value?.code_marchand_om || restaurantInfo.value?.orange_merchant || '654321'
  const orangePhone = restaurantInfo.value?.numero_om || restaurantInfo.value?.phone?.replace(/\D/g, '').slice(-8) || '77121289'
  const codeRef = order.value?.codeReference || order.value?.code_reference || ''

  const moovCode = restaurantInfo.value?.moov_merchant || '54321'
  const waveId = restaurantInfo.value?.wave_merchant || 'resto-premium'
  const waveDirectUrl = restaurantInfo.value?.wave_url || `https://pay.wave.com/m/${waveId}`

  // Syntaxe USSD Orange Money :
  // - Marchand : *144*4*6*codeMarchand*montant*codeReference#
  // - Classique (P2P Caissier) : *144*2*1*numeroOM*montant#
  const getOmUssd = (amount) => isOmMarchand
    ? `*144*4*6*${orangeMerchantCode}*${amount}*${codeRef}#`
    : `*144*2*1*${orangePhone}*${amount}#`

  const getOmTelUrl = (amount) => isOmMarchand
    ? `tel:*144*4*6*${orangeMerchantCode}*${amount}*${codeRef}%23`
    : `tel:*144*2*1*${orangePhone}*${amount}%23`

  return {
    orange_money: {
      id: 'orange_money',
      name: isOmMarchand ? 'Orange Money (Compte Marchand)' : 'Orange Money (Transfert Direct)',
      shortName: 'Orange Money',
      icon: '🟠',
      accountType: typeCompteOM,
      merchantCode: isOmMarchand ? orangeMerchantCode : orangePhone,
      codeReference: codeRef,
      themeClass: 'theme-orange',
      accentColor: '#ff7900',
      type: 'ussd',
      getUssd: getOmUssd,
      getTelUrl: getOmTelUrl,
      step1: isOmMarchand 
        ? `Code Marchand : ${orangeMerchantCode} · Référence : ${codeRef}` 
        : `Numéro Caissier : ${orangePhone}`,
      step2: 'Saisissez votre code secret Orange Money pour valider'
    },
    moov_money: {
      id: 'moov_money',
      name: 'Moov Money Burkina',
      shortName: 'Moov Money',
      icon: '🔵',
      merchantCode: moovCode,
      themeClass: 'theme-moov',
      accentColor: '#0066b3',
      type: 'ussd',
      getUssd: (amount) => `*555*4*1*${moovCode}*${amount}#`,
      getTelUrl: (amount) => `tel:*555*4*1*${moovCode}*${amount}%23`,
      step1: `Composez le code marchand Moov ${restoName}`,
      step2: 'Saisissez votre code secret Moov Money pour confirmer'
    },
    wave: {
      id: 'wave',
      name: 'Wave Burkina',
      shortName: 'Wave',
      icon: '🌊',
      merchantCode: waveId,
      themeClass: 'theme-wave',
      accentColor: '#1dc3f4',
      type: 'direct',
      getUssd: (amount) => `Virement Wave vers ${restoName} (${amount} FCFA)`,
      getTelUrl: (amount) => `${waveDirectUrl}?amount=${amount}`,
      step1: 'Scannez le QR Code Wave avec votre application Wave',
      step2: `Confirmez le transfert sécurisé vers ${restoName}`
    }
  }
})

// Alias pour rétrocompatibilité
const OPERATOR_CONFIG = dynamicOperatorConfig

// Opérateur actuellement sélectionné
const currentOperator = computed(() => {
  const method = order.value?.modePaiement || order.value?.mode_paiement || 'orange_money'
  return dynamicOperatorConfig.value?.[method] || dynamicOperatorConfig.value?.orange_money || {}
})

// Minuteur TTL (10 minutes)
const timeLeftSeconds = ref(600)
let timerInterval = null
let pollingInterval = null

const orderAmount = computed(() => {
  return order.value?.montantTotal || order.value?.total || 0
})

const currentUssdCode = computed(() => {
  if (!currentOperator.value?.getUssd) return ''
  return currentOperator.value.getUssd(orderAmount.value)
})

const currentActionUrl = computed(() => {
  if (!currentOperator.value?.getTelUrl) return '#'
  return currentOperator.value.getTelUrl(orderAmount.value)
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

// Changement d'opérateur en cours de paiement
const switchOperator = async (newOp) => {
  if (currentOperator.value.id === newOp) return
  try {
    await updateCommandePaymentMethod(orderId.value, newOp)
    if (order.value) {
      order.value.modePaiement = newOp
      order.value.mode_paiement = newOp
    }
    await generateQrCode()
    // Si l'utilisateur est dans un navigateur standard, forcer l'ouverture du composeur pour le nouvel opérateur
    if (!isInAppBrowser.value && currentOperator.value?.type === 'ussd') {
      setTimeout(() => {
        forceOpenDialer()
      }, 300)
    }
  } catch (err) {
    console.error('Erreur changement opérateur:', err)
  }
}

// Génération du QR Code adapté à l'opérateur
const generateQrCode = async () => {
  try {
    qrCodeDataUrl.value = await QRCode.toDataURL(currentActionUrl.value, {
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

// Copier le code dans le presse-papier avec fallback WebView garanti
const copyCode = async (textToCopy) => {
  const text = textToCopy || currentUssdCode.value
  let success = false

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      success = true
    } catch (err) {
      console.warn("navigator.clipboard a échoué, essai fallback execCommand...", err)
    }
  }

  if (!success) {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.top = '-9999px'
      textArea.style.left = '-9999px'
      textArea.setAttribute('readonly', '')
      document.body.appendChild(textArea)
      textArea.select()
      textArea.setSelectionRange(0, 99999) // Compatibilité iOS
      success = document.execCommand('copy')
      document.body.removeChild(textArea)
    } catch (err) {
      console.error("Échec du fallback execCommand:", err)
    }
  }

  if (success) {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  }
}

// Annulation par le client
const handleCancel = async () => {
  if (!confirm("Voulez-vous vraiment annuler votre commande ? Les articles seront remis en stock.")) {
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

let socket = null

const handleSocketStatus = (payload) => {
  if (!payload) return
  const newStatus = payload.statut || payload.order?.statut
  if (!newStatus) return

  if (order.value) {
    order.value.statut = newStatus
  }

  if (['PAYEE', 'EN_PREPARATION', 'VALIDEE', 'PRETE'].includes(newStatus)) {
    if (timerInterval) clearInterval(timerInterval)
    if (pollingInterval) clearInterval(pollingInterval)
    router.push(`/confirmation/${orderId.value}`)
  } else if (newStatus === 'ANNULEE_PAR_CLIENT' || newStatus === 'ANNULEE_EXPIREE') {
    if (timerInterval) clearInterval(timerInterval)
    if (pollingInterval) clearInterval(pollingInterval)
  }
}

const handleSocketPaymentUpdated = (updatedOrder) => {
  if (updatedOrder && order.value) {
    const op = updatedOrder.modePaiement || updatedOrder.mode_paiement
    if (op && op !== (order.value.modePaiement || order.value.mode_paiement)) {
      order.value.modePaiement = op
      order.value.mode_paiement = op
      generateQrCode()
    }
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    const initialData = await orderStore.fetchOrderStatus(orderId.value)
    order.value = initialData

    if (order.value) {
      if (order.value.restaurantId || order.value.restaurant_id) {
        try {
          restaurantInfo.value = await getRestaurantByIdOrSlug(order.value.restaurantId || order.value.restaurant_id)
        } catch (e) {
          console.warn('Info restaurant non récupérée:', e)
        }
      }
      updateCountdown()
      await generateQrCode()

      if (order.value.statut === 'PAYEE' || order.value.statut === 'EN_PREPARATION') {
        router.push(`/confirmation/${orderId.value}`)
        return
      }

      // Connexion WebSocket temps réel
      joinOrderRoom(orderId.value)
      socket = getSocket()
      if (socket) {
        socket.on('order:status_changed', handleSocketStatus)
        socket.on('order:payment_updated', handleSocketPaymentUpdated)
      }

      timerInterval = setInterval(updateCountdown, 1000)
      // Polling de secours dégradé (sécurité réseau mobile)
      pollingInterval = setInterval(checkStatus, 5000)

      // Si le client est dans un navigateur standard (pas une WebView), forcer l'ouverture de l'application téléphone
      if (!isInAppBrowser.value && currentOperator.value?.type === 'ussd') {
        setTimeout(() => {
          triggerAutoDialerIfBrowser()
        }, 500)
      }
    }
  } catch (err) {
    console.error("Erreur chargement commande:", err)
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (pollingInterval) clearInterval(pollingInterval)
  if (socket) {
    socket.off('order:status_changed', handleSocketStatus)
    socket.off('order:payment_updated', handleSocketPaymentUpdated)
    leaveOrderRoom(orderId.value)
  }
})
</script>

<template>
  <div class="payment-page">
    <Navbar />

    <main class="payment-container">
      <!-- État Chargement -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Initialisation de votre paiement...</p>
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
      <div v-else-if="order" class="payment-card" :class="currentOperator.themeClass">
        <!-- Barre de changement d'opérateur -->
        <div class="operator-switcher">
          <span class="switcher-title">Moyen de paiement :</span>
          <div class="switcher-buttons">
            <button 
              v-for="op in Object.values(dynamicOperatorConfig)" 
              :key="op.id"
              class="switch-btn"
              :class="{ active: currentOperator.id === op.id, [op.id]: true }"
              @click="switchOperator(op.id)"
            >
              <span>{{ op.icon }}</span>
              <span>{{ op.shortName }}</span>
            </button>
          </div>
        </div>

        <!-- En-tête & Statut de validation en cours -->
        <div class="payment-header">
          <div class="brand-badge">
            <span class="brand-icon">{{ currentOperator.icon }}</span>
            <div>
              <h3>Paiement {{ currentOperator.name }}</h3>
              <p class="ref-order">Réf: #{{ order.id || order.orderId }} · Table n°{{ order.tableNumber }}</p>
            </div>
          </div>

          <div class="status-waiting-indicator">
            <span class="spinner-mini"></span>
            <span class="status-waiting-text">⏳ En attente de validation du paiement...</span>
          </div>
        </div>

        <!-- Montant à payer -->
        <div class="amount-banner">
          <span class="amount-label">Montant total à payer :</span>
          <span class="amount-value">{{ orderAmount.toLocaleString() }} FCFA</span>
        </div>

        <!-- Détails spécifiques Orange Money (Marchand avec Code Réf vs Classique avec Numéro Caissier) -->
        <div v-if="currentOperator.id === 'orange_money'" class="om-account-info-box">
          <div v-if="currentOperator.accountType === 'MARCHAND'" class="om-detail-grid">
            <div class="om-info-card">
              <span class="om-card-lbl">🏪 CODE MARCHAND</span>
              <span class="om-card-val">{{ currentOperator.merchantCode }}</span>
            </div>
            <div class="om-info-card highlight-ref">
              <span class="om-card-lbl">🔑 CODE RÉFÉRENCE UNIQUE</span>
              <span class="om-card-val ref-code">{{ currentOperator.codeReference }}</span>
            </div>
          </div>
          <div v-else class="om-detail-grid">
           <!--
            <div class="om-info-card">
              <span class="om-card-lbl">👤 NUMÉRO DU CAISSIER (P2P)</span>
              <span class="om-card-val">{{ currentOperator.merchantCode }}</span>
            </div>
             -->
          </div>
        </div>

        <!-- Instructions selon l'opérateur -->
        <div class="payment-methods-grid">
          <!-- Option Mobile : Solution A & C pour In-App, ou Bouton Direct pour Navigateur Normal -->
          <div class="method-card mobile-method">
            <span class="badge-step">Option 1 · Sur Smartphone</span>
            
            <!-- CAS 1 : Ouvert dans un navigateur In-App (TikTok, Instagram, Facebook...) et paiement USSD -->
            <template v-if="isInAppBrowser && currentOperator.type === 'ussd'">
              <div class="inapp-warning-banner">
                <div class="inapp-badge">
                  <span class="inapp-icon">📱</span>
                  <span>Navigateur <strong>{{ inAppName }}</strong> détecté</span>
                </div>
                <p class="inapp-desc">
                  L'application {{ inAppName }} bloque l'appel direct des codes USSD. Copiez simplement le code ci-dessous pour régler :
                </p>
              </div>

              <!-- SOLUTION A : Copie ergonomique + Étapes guidées -->
              <div class="inapp-copy-card">
                <div class="inapp-code-display">
                  <span class="inapp-code-label">Code USSD à composer :</span>
                  <code class="inapp-code-val">{{ currentUssdCode }}</code>
                </div>

                <button @click="copyCode()" class="btn-copy-main" :class="{ copied: copied }">
                  <span class="btn-copy-icon">{{ copied ? '✅' : '📋' }}</span>
                  <span class="btn-copy-text">
                    {{ copied ? 'Code copié dans le presse-papier !' : 'Copier le code USSD' }}
                  </span>
                </button>

                <div class="inapp-steps-guide">
                  <div class="guide-step">
                    <span class="step-num">1</span>
                    <span class="step-txt">Touchez <strong>Copier le code USSD</strong> ci-dessus</span>
                  </div>
                  <div class="guide-step">
                    <span class="step-num">2</span>
                    <span class="step-txt">Ouvrez l'application <strong>Téléphone</strong> de votre smartphone</span>
                  </div>
                  <div class="guide-step">
                    <span class="step-num">3</span>
                    <span class="step-txt"><strong>Collez</strong> le code, lancez l'appel et tapez votre code secret</span>
                  </div>
                </div>
              </div>

              <!-- SOLUTION C : Sortie vers Google Chrome sous Android -->
              <div v-if="isAndroid" class="inapp-escape-card">
                <div class="escape-divider">
                  <span>OU PAIEMENT DIRECT EN 1-CLIC</span>
                </div>
                <a :href="chromeIntentUrl" class="btn-open-chrome">
                  <span class="chrome-icon">🌐</span>
                  <span>Ouvrir dans Google Chrome</span>
                </a>
                <p class="escape-hint">
                  Dans Google Chrome, le code USSD s'ouvre en 1 clic sans devoir copier manuellement.
                </p>
              </div>
              <div v-else-if="isIOS" class="inapp-escape-card ios-tip">
                <p class="ios-hint">
                  💡 <strong>Astuce iPhone :</strong> Touchez les trois points <strong>•••</strong> en haut ou en bas, puis choisissez <em>"Ouvrir dans Safari"</em> pour payer en 1 clic.
                </p>
              </div>
            </template>

            <!-- CAS 2 : Navigateur Standard (Chrome, Safari, etc.) sur Smartphone -> Forcer l'ouverture de l'application Téléphone -->
            <template v-else>
              <div class="browser-direct-card">
                <div class="browser-status-banner">
                  <span class="pulse-phone-icon">📞</span>
                  <div>
                    <h4>Ouverture de votre application Téléphone</h4>
                    <p>Le code USSD est prêt sur votre composeur d'appels :</p>
                  </div>
                </div>

                <div v-if="currentOperator.type === 'ussd'" class="direct-code-preview">
                  <span class="code-preview-lbl">Code USSD préparé :</span>
                  <code class="code-highlight">{{ currentUssdCode }}</code>
                </div>

                <a 
                  :href="currentActionUrl" 
                  @click="forceOpenDialer" 
                  class="btn-action-call" 
                  :class="currentOperator.id"
                >
                  <span class="phone-icon">{{ currentOperator.type === 'ussd' ? '📞' : '🌊' }}</span>
                  <span>
                    {{ currentOperator.type === 'ussd' ? `Ouvrir l'application Téléphone (${currentUssdCode})` : `Transférer ${orderAmount.toLocaleString()} FCFA sur Wave` }}
                  </span>
                </a>

                <p v-if="currentOperator.type === 'ussd'" class="browser-auto-hint">
                  ⚡ <em>L'application Téléphone se déclenche automatiquement. Si elle ne s'est pas ouverte, appuyez sur le bouton ci-dessus pour forcer l'ouverture.</em>
                </p>

                <div v-if="currentOperator.type === 'ussd'" class="manual-box">
                  <span>Ou composez manuellement le code :</span>
                  <div class="code-box">
                    <code>{{ currentUssdCode }}</code>
                    <button @click="copyCode()" class="btn-copy">
                      {{ copied ? 'Copié ✓' : 'Copier' }}
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Option Desktop : Scan QR Code -->
          <div class="method-card desktop-method">
            <span class="badge-step">Option 2 · Depuis un Ordinateur</span>
            <h4>Scannez avec votre téléphone</h4>
            <!-- 
            <p>
              {{ currentOperator.type === 'ussd' 
                ? 'Pointez l\'appareil photo de votre smartphone pour déclencher immédiatement l\'appel USSD :' 
                : 'Scannez avec l\'appareil photo ou l\'application Wave pour régler instantanément :' }}
            </p>
            -->

            <div class="qr-container" v-if="qrCodeDataUrl">
              <img :src="qrCodeDataUrl" :alt="`QR Code Paiement ${currentOperator.shortName}`" class="qr-image" />
            </div>

            <span class="qr-hint">Paiement direct sécurisé sans intermédiaire</span>
          </div>
        </div>

        <!-- Attente active & Synchronisation WebSocket / Polling -->
        <!--<div class="polling-indicator" :class="{ 'socket-live': socketConnected }">
          <div class="pulsing-dot" :class="{ 'dot-live': socketConnected }"></div>
          <div class="polling-text">
            <strong>
              <template v-if="socketConnected">⚡ Synchronisation instantanée active</template>
              <template v-else>Attente de validation par la caisse...</template>
            </strong>
            <span>
              <template v-if="socketConnected">
                Dès que la caisse valide vos fonds {{ currentOperator.shortName }}, votre écran basculera instantanément sans rechargement.
              </template>
              <template v-else>
                La caisse vérifie la réception des fonds sur son terminal {{ currentOperator.shortName }} et valide votre commande. Cette page s'actualisera toute seule.
              </template>
            </span>
          </div>
        </div>
        -->

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

      <!-- État Commande Introuvable -->
      <div v-else class="status-card error-card">
        <div class="status-icon">⚠️</div>
        <h2>Commande introuvable</h2>
        <p>Impossible de retrouver cette commande. Veuillez vérifier votre lien ou passer une nouvelle commande.</p>
        <router-link to="/menu" class="btn-primary">Retourner au menu</router-link>
      </div>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.payment-page {
  background-color: #f7f4ee; /* Fond blanc crémé */
  color: #1a1a1a;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', sans-serif;
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
  color: #2b2b2b;
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
  color: #fff;
  border-radius: 14px;
  padding: 3rem 2rem;
  text-align: center;
  max-width: 600px;
  margin: 3rem auto;
  border: 2px solid #d4af37;
  box-shadow: 0 12px 40px rgba(212, 175, 55, 0.18), 0 8px 30px rgba(0, 0, 0, 0.35);
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
  color: #0b0b0b;
  padding: 0.8rem 1.8rem;
  border-radius: 4px;
  font-weight: bold;
  text-decoration: none;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #c5a059;
}

/* Carte de Paiement Principale (Enveloppe Sombre avec Bordure Dorée) */
.payment-card {
  background-color: #141414; /* Couleur précédente préservée */
  color: #fff;
  border-radius: 14px;
  border: 2px solid #d4af37; /* Bordure dorée raffinée */
  padding: 2.2rem;
  box-shadow: 0 15px 45px rgba(212, 175, 55, 0.18), 0 10px 30px rgba(0, 0, 0, 0.35);
  transition: all 0.3s ease;
}

.payment-card.theme-orange {
  border-color: #d4af37;
  box-shadow: 0 15px 45px rgba(212, 175, 55, 0.22), 0 0 20px rgba(255, 121, 0, 0.15);
}

.payment-card.theme-moov {
  border-color: #d4af37;
  box-shadow: 0 15px 45px rgba(212, 175, 55, 0.22), 0 0 20px rgba(0, 102, 179, 0.15);
}

.payment-card.theme-wave {
  border-color: #d4af37;
  box-shadow: 0 15px 45px rgba(212, 175, 55, 0.22), 0 0 20px rgba(29, 195, 244, 0.15);
}

/* Sélecteur d'opérateur rapide */
.operator-switcher {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.8rem;
  padding-bottom: 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
  gap: 10px;
}

.switcher-title {
  font-size: 0.85rem;
  color: #888;
  font-weight: 500;
}

.switcher-buttons {
  display: flex;
  gap: 8px;
}

.switch-btn {
  background: #1e1e1e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #bbb;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.82rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.switch-btn:hover {
  background: #2a2a2a;
  color: #fff;
}

.switch-btn.active.orange_money {
  background: rgba(255, 121, 0, 0.15);
  border-color: #ff7900;
  color: #ff7900;
  font-weight: 600;
}

.switch-btn.active.moov_money {
  background: rgba(0, 102, 179, 0.15);
  border-color: #0066b3;
  color: #3399ff;
  font-weight: 600;
}

.switch-btn.active.wave {
  background: rgba(29, 195, 244, 0.15);
  border-color: #1dc3f4;
  color: #1dc3f4;
  font-weight: 600;
}

/* En-tête */
.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.brand-icon {
  font-size: 2.2rem;
}

.brand-badge h3 {
  font-size: 1.25rem;
  margin-bottom: 0.2rem;
  color: #fff;
}

.ref-order {
  font-size: 0.85rem;
  color: #888;
}

.status-waiting-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(212, 175, 55, 0.08);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 8px;
  padding: 0.65rem 1.1rem;
}

.spinner-mini {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(212, 175, 55, 0.2);
  border-top-color: #d4af37;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

.status-waiting-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: #d4af37;
}

.om-account-info-box {
  margin-bottom: 2rem;
}

.om-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.om-info-card {
  background: #181818;
  border: 1px solid rgba(255, 121, 0, 0.25);
  border-radius: 8px;
  padding: 0.9rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.om-info-card.highlight-ref {
  border-color: #ff7900;
  background: rgba(255, 121, 0, 0.08);
}

.om-card-lbl {
  font-size: 0.72rem;
  letter-spacing: 0.5px;
  color: #aaa;
  font-weight: 600;
}

.om-card-val {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
}

.om-card-val.ref-code {
  font-family: monospace;
  font-size: 1.4rem;
  color: #ff7900;
  letter-spacing: 2px;
}

.amount-banner {
  background: linear-gradient(135deg, #181818 0%, #1f1f1f 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1.2rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.amount-label {
  font-size: 0.95rem;
  color: #bbb;
}

.amount-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #d4af37;
}

.payment-methods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.method-card {
  background: #181818;
  border: 1px solid #282828;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.badge-step {
  display: inline-block;
  align-self: flex-start;
  font-size: 0.7rem;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.08);
  color: #ccc;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  margin-bottom: 0.8rem;
  text-transform: uppercase;
}

.method-card h4 {
  font-size: 1.05rem;
  color: #fff;
  margin-bottom: 0.5rem;
}

.method-card p {
  font-size: 0.85rem;
  color: #888;
  line-height: 1.4;
  margin-bottom: 1.2rem;
}

.btn-action-call {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  color: #fff;
  text-decoration: none;
  font-weight: bold;
  padding: 0.9rem 1.2rem;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s;
  text-align: center;
}

.btn-action-call.orange_money {
  background-color: #ff6600;
}
.btn-action-call.orange_money:hover {
  background-color: #e65c00;
  transform: translateY(-1px);
}

.btn-action-call.moov_money {
  background-color: #0066b3;
}
.btn-action-call.moov_money:hover {
  background-color: #00508f;
  transform: translateY(-1px);
}

.btn-action-call.wave {
  background-color: #0099cc;
}
.btn-action-call.wave:hover {
  background-color: #0088b8;
  transform: translateY(-1px);
}

.manual-box {
  margin-top: 1.2rem;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
}

.manual-box span {
  display: block;
  font-size: 0.75rem;
  color: #777;
  margin-bottom: 0.4rem;
}

.code-box {
  display: flex;
  background: #0d0d0d;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: hidden;
}

.code-box code {
  flex: 1;
  padding: 0.5rem 0.8rem;
  font-size: 0.82rem;
  color: #d4af37;
  overflow-x: auto;
  white-space: nowrap;
}

.btn-copy {
  background: #2a2a2a;
  border: none;
  color: #fff;
  padding: 0 0.8rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-copy:hover {
  background: #3a3a3a;
}

/* Styles Spécifiques Navigateurs In-App (TikTok, Instagram, Facebook) */
.inapp-warning-banner {
  background: rgba(255, 121, 0, 0.08);
  border: 1px solid rgba(255, 121, 0, 0.25);
  border-radius: 8px;
  padding: 0.9rem 1rem;
  margin-bottom: 1.2rem;
}

.inapp-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 121, 0, 0.2);
  color: #ff9433;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.inapp-desc {
  font-size: 0.82rem;
  color: #bbb;
  line-height: 1.4;
  margin: 0;
}

.inapp-copy-card {
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.inapp-code-display {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  background: #080808;
  border: 1px dashed rgba(212, 175, 55, 0.35);
  border-radius: 6px;
  padding: 0.8rem 1rem;
  text-align: center;
}

.inapp-code-label {
  font-size: 0.72rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.inapp-code-val {
  font-family: monospace;
  font-size: 1.2rem;
  color: #d4af37;
  font-weight: 700;
  letter-spacing: 1px;
  word-break: break-all;
}

.btn-copy-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: linear-gradient(135deg, #ff7900 0%, #ff5500 100%);
  color: #fff;
  border: none;
  padding: 0.95rem 1.2rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 121, 0, 0.3);
  transition: all 0.25s ease;
}

.btn-copy-main:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 121, 0, 0.4);
}

.btn-copy-main.copied {
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
}

.inapp-steps-guide {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  padding: 0.8rem;
}

.guide-step {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  font-size: 0.8rem;
  color: #aaa;
  line-height: 1.35;
}

.guide-step strong {
  color: #fff;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(212, 175, 55, 0.2);
  color: #d4af37;
  font-size: 0.72rem;
  font-weight: bold;
  flex-shrink: 0;
  margin-top: 1px;
}

/* Solution C : Deep-link Chrome */
.inapp-escape-card {
  margin-top: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  text-align: center;
}

.escape-divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #555;
  font-size: 0.68rem;
  letter-spacing: 1px;
  margin: 0.4rem 0;
}

.escape-divider::before,
.escape-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.escape-divider span {
  padding: 0 0.8rem;
}

.btn-open-chrome {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: #23272e;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  text-decoration: none;
  padding: 0.8rem 1.2rem;
  border-radius: 6px;
  font-size: 0.88rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-open-chrome:hover {
  background: #2d323b;
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.chrome-icon {
  font-size: 1.1rem;
}

.escape-hint {
  font-size: 0.74rem;
  color: #777;
  line-height: 1.3;
  margin: 0;
}

.ios-tip {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  padding: 0.7rem 0.9rem;
  text-align: left;
}

.ios-hint {
  font-size: 0.78rem;
  color: #aaa;
  margin: 0;
  line-height: 1.35;
}

/* Styles Navigateur Smartphone Standard */
.browser-direct-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.browser-status-banner {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: rgba(46, 204, 113, 0.08);
  border: 1px solid rgba(46, 204, 113, 0.25);
  border-radius: 8px;
  padding: 0.9rem 1.1rem;
}

.pulse-phone-icon {
  font-size: 1.5rem;
  animation: bounce 1.8s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.browser-status-banner h4 {
  font-size: 0.95rem;
  color: #2ecc71;
  margin-bottom: 0.2rem;
}

.browser-status-banner p {
  font-size: 0.8rem;
  color: #bbb;
  margin: 0;
}

.direct-code-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 0.7rem 1rem;
  text-align: center;
}

.code-preview-lbl {
  font-size: 0.7rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.code-highlight {
  font-family: monospace;
  font-size: 1.2rem;
  color: #d4af37;
  font-weight: 700;
  letter-spacing: 1px;
  word-break: break-all;
}

.browser-auto-hint {
  font-size: 0.76rem;
  color: #888;
  text-align: center;
  line-height: 1.35;
  margin: 0;
}

.desktop-method {
  align-items: center;
  text-align: center;
}

.qr-container {
  background: #fff;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 0.8rem;
  display: inline-block;
}

.qr-image {
  display: block;
  width: 170px;
  height: 170px;
}

.qr-hint {
  font-size: 0.75rem;
  color: #777;
}

/* Polling */
.polling-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1rem 1.4rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
}

.polling-indicator.socket-live {
  background: rgba(46, 204, 113, 0.06);
  border-color: rgba(46, 204, 113, 0.3);
}

.pulsing-dot {
  width: 12px;
  height: 12px;
  background-color: #d4af37;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
  flex-shrink: 0;
}

.pulsing-dot.dot-live {
  background-color: #2ecc71;
  animation: pulseLive 1.5s infinite;
}

@keyframes pulseLive {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
  100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
}

@keyframes pulse {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); }
  100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
}

.polling-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.polling-text strong {
  font-size: 0.95rem;
  color: #fff;
}

.polling-text span {
  font-size: 0.82rem;
  color: #888;
}

.payment-actions {
  text-align: center;
}

.btn-cancel {
  background: transparent;
  border: 1px solid rgba(231, 76, 60, 0.4);
  color: #e74c3c;
  padding: 0.6rem 1.4rem;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.1);
  border-color: #e74c3c;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .payment-methods-grid {
    grid-template-columns: 1fr;
  }
  .payment-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .countdown-box {
    align-self: stretch;
    text-align: center;
  }
}
</style>
