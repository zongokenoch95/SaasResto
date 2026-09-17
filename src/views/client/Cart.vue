<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cartStore'
import { useOrderStore } from '@/stores/orderStore'
import CartItem from '@/components/CartItem.vue'
import PromoBanner from '@/components/PromoBanner.vue'
import Navbar from '@/components/Navbar.vue'

const cartStore = useCartStore()
const orderStore = useOrderStore()
const router = useRouter()

const errorMessage = ref('')

const customerName = computed({
  get: () => cartStore.customerName,
  set: (val) => { cartStore.customerName = val }
})

const customerPhone = computed({
  get: () => cartStore.customerPhone,
  set: (val) => { cartStore.customerPhone = val }
})

const tableNumber = computed({
  get: () => cartStore.tableNumber,
  set: (val) => { cartStore.tableNumber = val }
})

const specialNotes = computed({
  get: () => cartStore.specialNotes,
  set: (val) => { cartStore.specialNotes = val }
})

const paymentMethod = computed({
  get: () => cartStore.paymentMethod || 'orange_money',
  set: (val) => { cartStore.paymentMethod = val }
})

const operatorInfo = {
  orange_money: {
    name: 'Orange Money',
    icon: '🟠',
    label: 'Numéro de téléphone Orange Money *',
    hint: 'Numéro utilisé pour le paiement USSD Orange Money (*144*4*6*...#)',
    placeholder: 'Ex: 70 12 34 56',
    colorClass: 'btn-orange'
  },
  moov_money: {
    name: 'Moov Money',
    icon: '🔵',
    label: 'Numéro de téléphone Moov Money *',
    hint: 'Numéro utilisé pour le paiement USSD Moov Money (*555*4*1*...#)',
    placeholder: 'Ex: 60 12 34 56',
    colorClass: 'btn-moov'
  },
  wave: {
    name: 'Wave',
    icon: '🌊',
    label: 'Numéro de téléphone Wave *',
    hint: 'Numéro associé à votre compte Wave pour le virement direct sans frais',
    placeholder: 'Ex: 77 12 34 56',
    colorClass: 'btn-wave'
  }
}

const handleCheckout = async () => {
  if (!customerName.value.trim() || !tableNumber.value || !customerPhone.value.trim()) {
    errorMessage.value = `Veuillez renseigner votre nom, votre numéro de table et votre numéro ${operatorInfo[paymentMethod.value].name}.`
    return
  }

  errorMessage.value = ''

  try {
    const orderPayload = {
      customerName: customerName.value.trim(),
      numeroClient: customerPhone.value.trim(),
      customerPhone: customerPhone.value.trim(),
      tableNumber: Number(tableNumber.value),
      specialNotes: specialNotes.value.trim(),
      modePaiement: paymentMethod.value,
      mode_paiement: paymentMethod.value,
      items: cartStore.items,
      montantTotal: cartStore.totalPrice
    }

    const order = await orderStore.submitOrder(orderPayload)
    const targetId = order?.id || order?.orderId
    if (targetId) {
      router.push(`/paiement/${targetId}`)
    } else {
      router.push('/menu')
    }
  } catch (err) {
    errorMessage.value = orderStore.error || err.message || "Erreur lors de l'enregistrement de la commande."
  }
}
</script>

<template>
  <div class="cart-page">
    <Navbar />

    <div class="container cart-container">
      <h1 class="page-title">Mon Panier</h1>
      <p class="page-subtitle">Révisez votre sélection avant de valider votre commande sur table.</p>

      <div v-if="cartStore.items.length === 0" class="empty-cart">
        <p>Votre panier est actuellement vide.</p>
        <router-link to="/menu" class="btn-gold">Consulter le menu</router-link>
      </div>

      <div v-else class="cart-content">
        <!-- Lien pour ajouter un autre plat -->
        <router-link to="/menu" class="add-more-link">
          ← Ajouter un autre plat
        </router-link>

        <!-- Liste des produits -->
        <div class="items-list">
          <CartItem 
            v-for="item in cartStore.items" 
            :key="item.product?.id || item.id" 
            :item="item" 
          />
        </div>

        <!-- Formulaire de commande & Sélection du mode de paiement -->
        <form @submit.prevent="handleCheckout" class="checkout-form">
          <!-- Sélecteur d'opérateur Mobile Money -->
          <div class="payment-choice-box">
            <span class="choice-title">Choisissez votre moyen de paiement Mobile Money :</span>
            <div class="operator-cards">
              <button 
                type="button" 
                class="operator-card" 
                :class="{ active: paymentMethod === 'orange_money', 'card-orange': paymentMethod === 'orange_money' }"
                @click="paymentMethod = 'orange_money'"
              >
                <span class="op-icon">🟠</span>
                <div class="op-info">
                  <span class="op-name">Orange Money</span>
                  <span class="op-sub">USSD *144#</span>
                </div>
              </button>

              <button 
                type="button" 
                class="operator-card" 
                :class="{ active: paymentMethod === 'moov_money', 'card-moov': paymentMethod === 'moov_money' }"
                @click="paymentMethod = 'moov_money'"
              >
                <span class="op-icon">🔵</span>
                <div class="op-info">
                  <span class="op-name">Moov Money</span>
                  <span class="op-sub">USSD *555#</span>
                </div>
              </button>

              <button 
                type="button" 
                class="operator-card" 
                :class="{ active: paymentMethod === 'wave', 'card-wave': paymentMethod === 'wave' }"
                @click="paymentMethod = 'wave'"
              >
                <span class="op-icon">🌊</span>
                <div class="op-info">
                  <span class="op-name">Wave</span>
                  <span class="op-sub">Transfert & QR</span>
                </div>
              </button>
            </div>
          </div>

          <div v-if="errorMessage" class="error-banner">
            {{ errorMessage }}
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="customerName">Nom du client *</label>
              <input 
                id="customerName" 
                v-model="customerName" 
                type="text" 
                placeholder="Ex: M./Mme Zongo" 
                autocomplete="off"
                required 
              />
            </div>

            <div class="form-group">
              <label for="tableNumber">Numéro de table *</label>
              <input 
                id="tableNumber" 
                v-model="tableNumber" 
                type="number" 
                placeholder="Ex: 12" 
                min="1"
                max="99"
                autocomplete="off"
                required 
              />
            </div>
          </div>

          <!-- Champ téléphone dynamique selon opérateur -->
          <div class="form-group">
            <label for="customerPhone">{{ operatorInfo[paymentMethod].label }}</label>
            <input 
              id="customerPhone" 
              v-model="customerPhone" 
              type="tel" 
              :placeholder="operatorInfo[paymentMethod].placeholder" 
              autocomplete="tel"
              required 
            />
            <span class="input-hint">{{ operatorInfo[paymentMethod].hint }}</span>
          </div>

          <div class="form-group">
            <label for="specialNotes">Instructions Spéciales (Allergies, Cuisson...)</label>
            <textarea 
              id="specialNotes" 
              v-model="specialNotes" 
              rows="2" 
              placeholder="Ajoutez une précision pour la cuisine..."
              autocomplete="off"
            ></textarea>
          </div>

          <div class="cart-summary">
            <div class="summary-info">
              <div class="total-label">Total à régler :</div>
              <div class="total-amount">{{ (cartStore.totalPrice || 0).toLocaleString() }} FCFA</div>
            </div>
            <button 
              type="submit" 
              class="btn-submit" 
              :class="operatorInfo[paymentMethod].colorClass"
              :disabled="orderStore.isLoading"
            >
              {{ orderStore.isLoading ? 'Enregistrement...' : `Payer avec ${operatorInfo[paymentMethod].name} →` }}
            </button>
          </div>
        </form>
      </div>

      <!-- Section Promotions & Événements -->
      <section class="promo-section">
        <PromoBanner />
      </section>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  background-color: #0d0d0d;
  color: #fff;
  min-height: 100vh;
  padding: 0 0 4rem;
  font-family: 'Inter', sans-serif;
}

.cart-container {
  padding: 2.5rem 20px;
}

.page-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.4rem;
  color: #d4af37;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: #888;
  margin-bottom: 2rem;
}

.empty-cart {
  text-align: center;
  padding: 4rem 1rem;
  background: #141414;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.empty-cart p {
  color: #aaa;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

.add-more-link {
  display: inline-block;
  color: #d4af37;
  text-decoration: none;
  font-weight: 500;
  margin-bottom: 1.5rem;
  transition: color 0.2s;
}

.add-more-link:hover {
  color: #ffd700;
  text-decoration: underline;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.checkout-form {
  background: #141414;
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 8px;
  padding: 2rem;
}

/* Sélecteur d'opérateur Mobile Money */
.payment-choice-box {
  margin-bottom: 1.8rem;
}

.choice-title {
  display: block;
  font-size: 0.92rem;
  color: #bbb;
  margin-bottom: 0.8rem;
  font-weight: 500;
}

.operator-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.operator-card {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px 10px;
  color: #ccc;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.operator-card:hover {
  background: #222;
  border-color: rgba(255, 255, 255, 0.3);
}

.operator-card .op-icon {
  font-size: 1.4rem;
}

.operator-card .op-info {
  display: flex;
  flex-direction: column;
}

.operator-card .op-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
}

.operator-card .op-sub {
  font-size: 0.72rem;
  color: #777;
}

.operator-card.active.card-orange {
  background: rgba(255, 121, 0, 0.12);
  border-color: #ff7900;
  box-shadow: 0 0 10px rgba(255, 121, 0, 0.25);
}
.operator-card.active.card-orange .op-name {
  color: #ff7900;
}

.operator-card.active.card-moov {
  background: rgba(0, 102, 179, 0.15);
  border-color: #0066b3;
  box-shadow: 0 0 10px rgba(0, 102, 179, 0.25);
}
.operator-card.active.card-moov .op-name {
  color: #3399ff;
}

.operator-card.active.card-wave {
  background: rgba(29, 195, 244, 0.15);
  border-color: #1dc3f4;
  box-shadow: 0 0 10px rgba(29, 195, 244, 0.25);
}
.operator-card.active.card-wave .op-name {
  color: #1dc3f4;
}

.error-banner {
  background: rgba(231, 76, 60, 0.15);
  border-left: 4px solid #e74c3c;
  color: #ff8888;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  border-radius: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.85rem;
  color: #ccc;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  background: #0d0d0d;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #d4af37;
}

.input-hint {
  font-size: 0.75rem;
  color: #777;
}

.cart-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 1.5rem;
  margin-top: 1rem;
}

.total-label {
  font-size: 0.9rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.total-amount {
  font-size: 1.8rem;
  font-weight: bold;
  color: #d4af37;
}

.btn-submit {
  color: #fff;
  border: none;
  padding: 0.95rem 1.8rem;
  font-weight: bold;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.btn-submit.btn-orange {
  background-color: #ff6600;
}
.btn-submit.btn-orange:hover:not(:disabled) {
  background-color: #e65c00;
  transform: translateY(-1px);
}

.btn-submit.btn-moov {
  background-color: #0066b3;
}
.btn-submit.btn-moov:hover:not(:disabled) {
  background-color: #00508f;
  transform: translateY(-1px);
}

.btn-submit.btn-wave {
  background-color: #0099cc;
}
.btn-submit.btn-wave:hover:not(:disabled) {
  background-color: #0088b8;
  transform: translateY(-1px);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.promo-section {
  margin-top: 5rem;
}

@media (max-width: 650px) {
  .cart-container {
    padding: 1.5rem 12px;
  }
  .page-title {
    font-size: 1.85rem;
  }
  .page-subtitle {
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
  }
  .checkout-form {
    padding: 1.2rem;
  }
  .operator-cards {
    grid-template-columns: 1fr;
  }
  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .cart-summary {
    flex-direction: column;
    gap: 1.2rem;
    align-items: stretch;
  }
  .btn-submit {
    width: 100%;
    text-align: center;
  }
  .promo-section {
    margin-top: 3rem;
  }
}
</style>
