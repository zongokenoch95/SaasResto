import { defineStore } from 'pinia';
import { getRestaurants, getRestaurantByIdOrSlug } from '@/services/api';

export const useRestaurantStore = defineStore('restaurant', {
  state: () => ({
    restaurants: [],
    currentRestaurant: null,
    isLoading: false,
    error: null
  }),

  getters: {
    activeRestaurantId: (state) => state.currentRestaurant?.id || 'resto-premium-01',
    activeRestaurantName: (state) => state.currentRestaurant?.name || 'RestoPremium',
    merchantConfig: (state) => ({
      orangeMerchant: state.currentRestaurant?.orange_merchant || '654321',
      moovMerchant: state.currentRestaurant?.moov_merchant || '54321',
      waveMerchant: state.currentRestaurant?.wave_merchant || 'resto-premium',
      waveUrl: state.currentRestaurant?.wave_url || 'https://pay.wave.com/m/resto-premium'
    })
  },

  actions: {
    async fetchRestaurants() {
      this.isLoading = true;
      try {
        const list = await getRestaurants();
        this.restaurants = list || [];
        if (!this.currentRestaurant && this.restaurants.length > 0) {
          const savedSlug = localStorage.getItem('saasresto_current_slug');
          const matched = this.restaurants.find(r => r.slug === savedSlug) || this.restaurants[0];
          this.currentRestaurant = matched;
        }
      } catch (err) {
        this.error = err.message;
        console.error('Erreur chargement restaurants:', err);
      } finally {
        this.isLoading = false;
      }
    },

    async selectRestaurantBySlug(slug) {
      this.isLoading = true;
      try {
        const resto = await getRestaurantByIdOrSlug(slug);
        this.currentRestaurant = resto;
        localStorage.setItem('saasresto_current_slug', resto.slug);
        return resto;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    setRestaurant(resto) {
      if (resto) {
        this.currentRestaurant = resto;
        if (resto.slug) {
          localStorage.setItem('saasresto_current_slug', resto.slug);
        }
      }
    }
  }
});
