import { defineStore } from 'pinia'
import { loginRestaurant, logoutRestaurant, getAuthMe } from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('resto_token') || '',
    user: JSON.parse(localStorage.getItem('resto_user') || 'null'),
    isLoading: false,
    error: null
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    isCaisse: (state) => state.user?.role === 'caisse' || state.user?.role === 'admin',
    isCuisine: (state) => state.user?.role === 'cuisine' || state.user?.role === 'caisse' || state.user?.role === 'admin',
    role: (state) => state.user?.role || '',
    userName: (state) => state.user?.name || ''
  },
  actions: {
    _saveStorage() {
      if (this.token) {
        localStorage.setItem('resto_token', this.token);
      } else {
        localStorage.removeItem('resto_token');
      }

      if (this.user) {
        localStorage.setItem('resto_user', JSON.stringify(this.user));
      } else {
        localStorage.removeItem('resto_user');
      }
    },

    async login(pin) {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await loginRestaurant(pin);
        this.token = data.token;
        this.user = data.user;
        this._saveStorage();
        return data;
      } catch (err) {
        this.error = err.message || 'Erreur lors de la connexion';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async logout() {
      try {
        if (this.token) {
          await logoutRestaurant();
        }
      } catch (err) {
        console.warn('Erreur déconnexion serveur:', err);
      } finally {
        this.token = '';
        this.user = null;
        this.error = null;
        this._saveStorage();
      }
    },

    async verifySession() {
      if (!this.token) return false;
      try {
        const res = await getAuthMe();
        if (res?.user) {
          this.user = res.user;
          this._saveStorage();
          return true;
        }
        return false;
      } catch (err) {
        // Session expirée ou invalide
        this.token = '';
        this.user = null;
        this._saveStorage();
        return false;
      }
    }
  }
});

