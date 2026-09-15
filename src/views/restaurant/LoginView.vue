<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const pin = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const hasError = ref(false)

const handleDigit = (digit) => {
  if (pin.value.length < 4) {
    pin.value += digit
    errorMessage.value = ''
    hasError.value = false

    // Auto-soumission dès que les 4 chiffres sont saisis
    if (pin.value.length === 4) {
      submitPin()
    }
  }
}

const handleBackspace = () => {
  if (pin.value.length > 0) {
    pin.value = pin.value.slice(0, -1)
    errorMessage.value = ''
    hasError.value = false
  }
}

const handleClear = () => {
  pin.value = ''
  errorMessage.value = ''
  hasError.value = false
}

const submitPin = async (explicitPin = null) => {
  const pinToUse = explicitPin || pin.value
  if (!pinToUse || pinToUse.length < 4) {
    errorMessage.value = 'Veuillez saisir un code PIN à 4 chiffres.'
    hasError.value = true
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  hasError.value = false

  try {
    await authStore.login(pinToUse)
    if (authStore.role === 'superadmin') {
      router.push('/superadmin')
    } else {
      const redirectPath = route.query.redirect || '/restaurant'
      router.push(redirectPath)
    }
  } catch (err) {
    errorMessage.value = err.message || 'Code PIN incorrect'
    hasError.value = true
    pin.value = ''
  } finally {
    isLoading.value = false
  }
}

// Raccourcis de démonstration
const quickLogin = (code) => {
  pin.value = code
  submitPin(code)
}

// Support des touches clavier physiques (0-9, Backspace, Escape, Enter)
const onKeyDown = (e) => {
  if (isLoading.value) return

  if (e.key >= '0' && e.key <= '9') {
    handleDigit(e.key)
  } else if (e.key === 'Backspace') {
    handleBackspace()
  } else if (e.key === 'Escape') {
    handleClear()
  } else if (e.key === 'Enter') {
    if (pin.value.length === 4) {
      submitPin()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  // Si déjà connecté, redirection vers le dashboard
  if (authStore.isAuthenticated) {
    router.replace('/restaurant')
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <!-- En-tête -->
      <div class="login-header">
        <div class="brand-badge">RestoPremium Staff</div>
        <h1 class="login-title">Espace Restaurant</h1>
        <p class="login-subtitle">Composez votre code PIN personnel pour accéder aux commandes</p>
      </div>

      <!-- Indicateur visuel des 4 chiffres du code PIN -->
      <div class="pin-display" :class="{ 'pin-error': hasError }">
        <div 
          v-for="i in 4" 
          :key="i" 
          class="pin-dot" 
          :class="{ 'filled': pin.length >= i }"
        ></div>
      </div>

      <!-- Message d'erreur -->
      <div v-if="errorMessage" class="error-alert">
        <span class="error-icon">⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Pavé numérique tactile -->
      <div class="numpad">
        <button 
          v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]" 
          :key="n" 
          @click="handleDigit(String(n))" 
          class="numpad-btn"
          :disabled="isLoading"
        >
          {{ n }}
        </button>

        <button 
          @click="handleBackspace" 
          class="numpad-btn action-btn" 
          title="Effacer un chiffre"
          :disabled="isLoading || pin.length === 0"
        >
          ⌫
        </button>

        <button 
          @click="handleDigit('0')" 
          class="numpad-btn"
          :disabled="isLoading"
        >
          0
        </button>

        <button 
          @click="() => submitPin()" 
          class="numpad-btn action-btn submit-btn" 
          title="Valider"
          :disabled="isLoading || pin.length < 4"
        >
          ✓
        </button>
      </div>

      <!-- Raccourcis de connexion rapide / Démo -->
      <div class="quick-access">
        <span class="quick-title">Profils d'accès rapide :</span>
        <div class="quick-badges">
          <button @click="quickLogin('1234')" class="badge-btn caisse">
            <span>🟠 Caisse</span>
            <small>PIN: 1234</small>
          </button>
          <button @click="quickLogin('5678')" class="badge-btn cuisine">
            <span>👨‍🍳 Cuisine</span>
            <small>PIN: 5678</small>
          </button>
          <button @click="quickLogin('0000')" class="badge-btn admin">
            <span>👑 Gérant</span>
            <small>PIN: 0000</small>
          </button>
          <button @click="quickLogin('9999')" class="badge-btn superadmin">
            <span>🏢 SuperAdmin</span>
            <small>PIN: 9999</small>
          </button>
        </div>
      </div>

      <!-- Lien de retour vers l'espace client -->
      <div class="login-footer">
        <router-link to="/" class="client-link">
          ← Retour à l'accueil client
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top center, #1f1b13 0%, #0d0d0d 70%);
  padding: 20px;
  color: #f5f5f5;
  font-family: 'Inter', sans-serif;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background-color: #141414;
  border: 1px solid rgba(197, 160, 89, 0.25);
  border-radius: 16px;
  padding: 36px 28px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.brand-badge {
  display: inline-block;
  background: rgba(197, 160, 89, 0.15);
  color: #c5a059;
  border: 1px solid rgba(197, 160, 89, 0.3);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.login-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem;
  color: #fff;
  margin: 0 0 6px 0;
}

.login-subtitle {
  font-size: 0.88rem;
  color: #999;
  margin: 0;
  line-height: 1.4;
}

/* Points PIN */
.pin-display {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px 24px;
  background: #0a0a0a;
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.25s ease;
}

.pin-display.pin-error {
  border-color: #e63946;
  animation: shake 0.35s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
  75% { transform: translateX(-4px); }
}

.pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #555;
  background: transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.pin-dot.filled {
  border-color: #c5a059;
  background-color: #c5a059;
  box-shadow: 0 0 10px rgba(197, 160, 89, 0.5);
  transform: scale(1.15);
}

/* Message d'alerte */
.error-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(230, 57, 70, 0.15);
  border: 1px solid rgba(230, 57, 70, 0.4);
  color: #ff6b6b;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 20px;
  width: 100%;
  box-sizing: border-box;
}

/* Pavé numérique */
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  width: 100%;
  max-width: 320px;
  margin-bottom: 26px;
}

.numpad-btn {
  aspect-ratio: 1;
  border-radius: 12px;
  background-color: #1c1c1c;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 1.5rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.numpad-btn:hover:not(:disabled) {
  background-color: #282828;
  border-color: rgba(197, 160, 89, 0.4);
  color: #c5a059;
  transform: translateY(-2px);
}

.numpad-btn:active:not(:disabled) {
  transform: translateY(1px) scale(0.97);
  background-color: #333;
}

.numpad-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.numpad-btn.action-btn {
  font-size: 1.25rem;
  background-color: #171717;
}

.numpad-btn.submit-btn {
  background: linear-gradient(135deg, #c5a059 0%, #b38f46 100%);
  color: #000;
  font-weight: bold;
}

.numpad-btn.submit-btn:hover:not(:disabled) {
  filter: brightness(1.15);
  color: #000;
}

/* Raccourcis démo */
.quick-access {
  width: 100%;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 18px;
  margin-bottom: 20px;
}

.quick-title {
  display: block;
  font-size: 0.78rem;
  color: #777;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  text-align: center;
}

.quick-badges {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.badge-btn {
  background-color: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 4px;
  color: #ddd;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: all 0.2s;
}

.badge-btn span {
  font-size: 0.8rem;
  font-weight: 500;
}

.badge-btn small {
  font-size: 0.7rem;
  color: #888;
}

.badge-btn:hover {
  background-color: #222;
  border-color: #c5a059;
}

.badge-btn.caisse:hover small {
  color: #ff9800;
}

.badge-btn.cuisine:hover small {
  color: #4caf50;
}

.badge-btn.admin:hover small {
  color: #c5a059;
}

.badge-btn.superadmin:hover small {
  color: #38ef7d;
}

/* Pied de page */
.login-footer {
  text-align: center;
}

.client-link {
  color: #888;
  font-size: 0.85rem;
  text-decoration: none;
  transition: color 0.2s;
}

.client-link:hover {
  color: #c5a059;
}
</style>

