import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: JSON.parse(localStorage.getItem('cart_items')) || [],
    customerName: localStorage.getItem('cart_customerName') || '',
    customerPhone: localStorage.getItem('cart_customerPhone') || '',
    tableNumber: localStorage.getItem('cart_tableNumber') || '',
    specialNotes: localStorage.getItem('cart_specialNotes') || ''
  }),
  getters: {
    totalPrice: (state) => state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    totalCount: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0)
  },
  actions: {
    _saveStorage() {
      localStorage.setItem('cart_items', JSON.stringify(this.items))
      localStorage.setItem('cart_customerName', this.customerName)
      localStorage.setItem('cart_customerPhone', this.customerPhone)
      localStorage.setItem('cart_tableNumber', this.tableNumber)
      localStorage.setItem('cart_specialNotes', this.specialNotes)
    },
    addItem(product, qty = 1) {
      const existing = this.items.find(item => String(item.product?.id) === String(product.id));
      if (existing) {
        existing.quantity += Number(qty);
      } else {
        this.items.push({ 
          product, 
          quantity: Number(qty), 
          price: product.price 
        });
      }
      this._saveStorage();
    },
    removeItem(productId) {
      this.items = this.items.filter(item => String(item.product?.id) !== String(productId));
      this._saveStorage();
    },
    updateQuantity(productId, qty) {
      const item = this.items.find(item => String(item.product?.id) === String(productId));
      if (item) {
        if (qty <= 0) {
          this.removeItem(productId);
        } else {
          item.quantity = Number(qty);
          this._saveStorage();
        }
      }
    },
    clearCart() {
      this.items = [];
      this.customerName = '';
      this.customerPhone = '';
      this.tableNumber = '';
      this.specialNotes = '';
      localStorage.removeItem('cart_items');
      localStorage.removeItem('cart_customerName');
      localStorage.removeItem('cart_customerPhone');
      localStorage.removeItem('cart_tableNumber');
      localStorage.removeItem('cart_specialNotes');
    }
  }
});
