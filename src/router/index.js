import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/client/Home.vue'
import Menu from '@/views/client/Menu.vue'
import ProductDetails from '@/views/client/ProductDetails.vue'
import Cart from '@/views/client/Cart.vue'
import PaymentView from '@/views/client/PaymentView.vue'
import OrderConfirmation from '@/views/client/OrderConfirmation.vue'
import DashboardView from '@/views/restaurant/DashboardView.vue'
import LoginView from '@/views/restaurant/LoginView.vue'
import { useAuthStore } from '@/stores/authStore'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/menu',
    name: 'Menu',
    component: Menu
  },
  {
    path: '/product/:id',
    name: 'ProductDetails',
    component: ProductDetails,
    props: true
  },
  {
    path: '/cart',
    name: 'Cart',
    component: Cart
  },
  {
    path: '/paiement/:id',
    name: 'Payment',
    component: PaymentView,
    props: true
  },
  {
    path: '/confirmation/:id?',
    name: 'OrderConfirmation',
    component: OrderConfirmation,
    props: true
  },
  {
    path: '/restaurant/login',
    name: 'RestaurantLogin',
    component: LoginView,
    meta: { guestOnly: true }
  },
  {
    path: '/restaurant',
    name: 'DashboardRestaurant',
    component: DashboardView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirection vers le login avec mémorisation de la destination
    next({ name: 'RestaurantLogin', query: { redirect: to.fullPath } })
  } else if (to.meta.guestOnly && authStore.isAuthenticated) {
    // Si déjà connecté et tente d'aller sur login, redirection vers le dashboard
    next({ name: 'DashboardRestaurant' })
  } else {
    next()
  }
})

export default router
