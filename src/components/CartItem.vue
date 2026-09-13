<script setup>
import { useCartStore } from '@/stores/cartStore'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const cartStore = useCartStore()

// Fonction pour charger dynamiquement l'image depuis src/assets/images/
const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http')) return imagePath
  
  // Extrait le nom du fichier (ex: "poulet.jpg") peu importe ce qui est écrit avant
  const fileName = imagePath.split('/').pop()
  
  try {
    return new URL(`../assets/images/${fileName}`, import.meta.url).href
  } catch (error) {
    console.error("Erreur d'image :", error)
    return ''
  }
}

const incrementQuantity = () => {
  cartStore.updateQuantity(props.item.product.id, props.item.quantity + 1)
}

const decrementQuantity = () => {
  if (props.item.quantity > 1) {
    cartStore.updateQuantity(props.item.product.id, props.item.quantity - 1)
  }
}

const removeItem = () => {
  cartStore.removeItem(props.item.product.id)
}
</script>

<template>
  <div class="cart-item">
    <img :src="getImageUrl(item.product?.image)" :alt="item.product?.name" class="item-image" />
    
    <div class="item-details">
      <h4 class="item-title">{{ item.product?.name }}</h4>
      <p class="item-description">{{ item.product?.description }}</p>
      <span class="item-price">{{ (item.price * item.quantity).toLocaleString() }} FCFA</span>
    </div>

    <div class="item-actions">
      <div class="quantity-controls">
        <button @click="decrementQuantity" class="btn-qty" :disabled="item.quantity <= 1">-</button>
        <span class="qty-value">{{ item.quantity }}</span>
        <button @click="incrementQuantity" class="btn-qty">+</button>
      </div>
      <button @click="removeItem" class="btn-remove" title="Supprimer l'article">
        🗑️
      </button>
    </div>
  </div>
</template>

<style scoped>
.cart-item {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem;
  background-color: #1a1a1a;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
  margin-bottom: 1rem;
}

.item-image {
  width: 70px;
  height: 70px;
  object-fit: cover;
  border-radius: 6px;
}

.item-details {
  flex: 1;
}

.item-title {
  color: #ffffff;
  font-size: 1.1rem;
  margin: 0 0 0.3rem 0;
}

.item-description {
  color: #a0a0a0;
  font-size: 0.85rem;
  margin: 0 0 0.5rem 0;
}

.item-price {
  color: #d4af37;
  font-weight: bold;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quantity-controls {
  display: flex;
  align-items: center;
  background: #2a2a2a;
  border-radius: 4px;
  padding: 0.2rem;
}

.btn-qty {
  background: transparent;
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-weight: bold;
}

.btn-qty:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.qty-value {
  color: #fff;
  padding: 0 0.5rem;
  font-weight: bold;
}

.btn-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
}
</style>