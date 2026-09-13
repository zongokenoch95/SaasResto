<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cartStore'
import { useOrderStore } from '@/stores/orderStore'
import CartItem from '@/components/CartItem.vue'
import PromoBanner from '@/components/PromoBanner.vue'

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

const handleCheckout = async () => {
  if (!customerName.value.trim() || !tableNumber.value || !customerPhone.value.trim()) {
    errorMessage.value = 'Veuillez renseigner votre nom, votre numéro de table et votre numéro Orange Money.'
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
    <div class="container">
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

        <!-- Formulaire de commande & Paiement Orange Money -->
        <form @submit.prevent="handleCheckout" class="checkout-form">
          <div class="form-header-badge">
            <span class="om-logo">🟠 Orange Money</span>
            <span class="om-tag">Paiement direct sans agrégateur</span>
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

          <div class="form-group">
            <label for="customerPhone">Numéro de téléphone Orange Money *</label>
            <input 
              id="customerPhone" 
              v-model="customerPhone" 
              type="tel" 
              placeholder="Ex: 70 12 34 56" 
              autocomplete="tel"
              required 
            />
            <span class="input-hint">Numéro utilisé pour le paiement USSD Orange Money (*144*4*6*...#)</span>
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
              :disabled="orderStore.isLoading"
            >
              {{ orderStore.isLoading ? 'Enregistrement...' : 'Passer au paiement (Orange Money) →' }}
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
  padding: 3rem 1rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  color: #d4af37;
  font-family: 'Playfair Display', serif;
  font-size: 2.2rem;
  margin-bottom: 0.2rem;
}

.page-subtitle {
  color: #888;
  margin-bottom: 2rem;
}

.add-more-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #d4af37;
  text-decoration: none;
  font-weight: 500;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  transition: opacity 0.2s;
}

.add-more-link:hover {
  opacity: 0.8;
}

.empty-cart {
  text-align: center;
  padding: 4rem 1rem;
}

.btn-gold {
  display: inline-block;
  background-color: #d4af37;
  color: #000;
  padding: 0.8rem 1.5rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
  margin-top: 1rem;
}

.checkout-form {
  background: #141414;
  padding: 1.8rem;
  border-radius: 10px;
  border: 1px solid #282828;
  margin-top: 2rem;
}

.form-header-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #1a150c;
  border: 1px solid rgba(255, 102, 0, 0.3);
  padding: 0.6rem 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.om-logo {
  color: #ff6600;
  font-weight: 700;
  font-size: 0.95rem;
}

.om-tag {
  color: #d4af37;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 0.85rem;
  color: #ccc;
  margin-bottom: 0.4rem;
  font-weight: 500;
}

.form-group input, .form-group textarea {
  background: #1f1f1f;
  border: 1px solid #333;
  color: #fff;
  padding: 0.8rem;
  border-radius: 4px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: #d4af37;
}

.input-hint {
  font-size: 0.75rem;
  color: #888;
  margin-top: 0.3rem;
}

.error-banner {
  background-color: #5a1a1a;
  color: #ff8888;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.cart-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1.2rem;
  border-top: 1px solid #252525;
}

.total-label {
  font-size: 0.85rem;
  color: #aaa;
}

.total-amount {
  font-size: 1.8rem;
  font-weight: bold;
  color: #d4af37;
}

.btn-submit {
  background-color: #ff6600;
  color: #fff;
  border: none;
  padding: 0.95rem 1.8rem;
  font-weight: bold;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background-color 0.2s, transform 0.1s;
}

.btn-submit:hover:not(:disabled) {
  background-color: #e65c00;
  transform: translateY(-1px);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.promo-section {
  margin-top: 5rem;
}

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .cart-summary {
    flex-direction: column;
    gap: 1.2rem;
    align-items: stretch;
  }
}
</style>
