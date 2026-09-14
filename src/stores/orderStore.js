import { defineStore } from 'pinia'
import { createCommande, getCommandeStatut, cancelCommandeClient } from '@/services/api'
import { useCartStore } from './cartStore'

export const useOrderStore = defineStore('order', {
  state: () => ({
    currentOrder: JSON.parse(localStorage.getItem('current_order')) || null,
    lastOrder: JSON.parse(localStorage.getItem('last_order')) || null,
    isLoading: false,
    error: null
  }),
  actions: {
    _saveStorage() {
      if (this.currentOrder) {
        localStorage.setItem('current_order', JSON.stringify(this.currentOrder));
      } else {
        localStorage.removeItem('current_order');
      }
      if (this.lastOrder) {
        localStorage.setItem('last_order', JSON.stringify(this.lastOrder));
      } else {
        localStorage.removeItem('last_order');
      }
    },

    // 1. Création de la commande avec réservation temporaire de stock
    async submitOrder(orderData) {
      const cartStore = useCartStore();
      this.isLoading = true;
      this.error = null;

      try {
        const payload = {
          restaurantId: "resto-premium-01",
          customerName: orderData.customerName || cartStore.customerName,
          numeroClient: orderData.numeroClient || orderData.customerPhone || cartStore.customerPhone,
          customerPhone: orderData.numeroClient || orderData.customerPhone || cartStore.customerPhone,
          tableNumber: Number(orderData.tableNumber || cartStore.tableNumber || 1),
          specialNotes: orderData.specialNotes || cartStore.specialNotes || "",
          modePaiement: orderData.modePaiement || cartStore.paymentMethod || "orange_money",
          mode_paiement: orderData.modePaiement || cartStore.paymentMethod || "orange_money",
          items: [...cartStore.items],
          montantTotal: cartStore.totalPrice,
          total: cartStore.totalPrice
        };

        const response = await createCommande(payload);
        this.currentOrder = response;
        this.lastOrder = response;
        this._saveStorage();

        // Le panier est vidé car la commande est enregistrée
        cartStore.clearCart();

        return response;
      } catch (err) {
        this.error = err.message || "Erreur lors de la création de la commande";
        console.error(err);
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    // 2. Vérification du statut de la commande (Polling)
    async fetchOrderStatus(orderId) {
      const id = orderId || this.currentOrder?.id || this.currentOrder?.orderId;
      if (!id) return null;

      try {
        const statusData = await getCommandeStatut(id);
        if (this.currentOrder && (this.currentOrder.id === id || this.currentOrder.orderId === id)) {
          this.currentOrder = {
            ...this.currentOrder,
            ...statusData,
            statut: statusData.statut || statusData.status
          };
          this._saveStorage();
        }
        return statusData;
      } catch (err) {
        console.error("Erreur polling statut:", err);
        return null;
      }
    },

    // 3. Annulation de la commande par le client
    async cancelOrder(orderId) {
      const id = orderId || this.currentOrder?.id || this.currentOrder?.orderId;
      if (!id) return;

      this.isLoading = true;
      try {
        const res = await cancelCommandeClient(id);
        if (this.currentOrder) {
          this.currentOrder.statut = 'ANNULEE_PAR_CLIENT';
          this.currentOrder.status = 'ANNULEE_PAR_CLIENT';
          this._saveStorage();
        }
        return res;
      } catch (err) {
        this.error = err.message || "Erreur lors de l'annulation";
        throw err;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
