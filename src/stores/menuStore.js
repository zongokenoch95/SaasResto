import { defineStore } from 'pinia'
import { getProducts, getProductById } from '@/services/api'

export const useMenuStore = defineStore('menu', {
  state: () => ({
    products: [],
    currentProduct: null,
    selectedCategory: 'Tous',
    isLoading: false,
    error: null
  }),
  getters: {
    filteredProducts: (state) => {
      if (state.selectedCategory === 'Tous') {
        return state.products
      }
      return state.products.filter(p => p.category === state.selectedCategory)
    }
  },
  actions: {
    async fetchMenu() {
      this.isLoading = true
      this.error = null
      try {
        this.products = await getProducts()
      } catch (err) {
        this.error = "Erreur lors du chargement du menu."
        console.error("Erreur:", err)
      } finally {
        this.isLoading = false
      }
    },
    // Alias pour éviter toute erreur si un composant appelle fetchProducts
    async fetchProducts() {
      return await this.fetchMenu()
    },
    async fetchProductById(id) {
      this.isLoading = true
      this.error = null
      try {
        this.currentProduct = await getProductById(id)
      } catch (err) {
        this.error = "Erreur lors du chargement du plat."
        console.error("Erreur:", err)
      } finally {
        this.isLoading = false
      }
    },
    setCategory(category) {
      this.selectedCategory = category
    }
  }
})