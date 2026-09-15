import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/client/Home.vue'
import Menu from '@/views/client/Menu.vue'
import ProductDetails from '@/views/client/ProductDetails.vue'
import Cart from '@/views/client/Cart.vue'
import PaymentView from '@/views/client/PaymentView.vue'
import OrderConfirmation from '@/views/client/OrderConfirmation.vue'
import DashboardView from '@/views/restaurant/DashboardView.vue'
import LoginView from '@/views/restaurant/LoginView.vue'
import SuperAdminView from '@/views/admin/SuperAdminView.vue'
import { useAuthStore } from '@/stores/authStore'
import { useRestaurantStore } from '@/stores/restaurantStore'

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
  },
  {
    path: '/superadmin',
    name: 'SuperAdmin',
    component: SuperAdminView,
    meta: { requiresAuth: true }
  },
  {
    path: '/r/:slug',
    redirect: to => `/r/${to.params.slug}/menu`
  },
  {
    path: '/r/:slug/menu',
    name: 'TenantMenu',
    component: Menu
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const restaurantStore = useRestaurantStore()

  // Détection du restaurant via l'URL /r/:slug
  if (to.params.slug) {
    try {
      await restaurantStore.selectRestaurantBySlug(to.params.slug)
    } catch (err) {
      console.warn('Restaurant introuvable:', to.params.slug)
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'RestaurantLogin', query: { redirect: to.fullPath } })
  } else if (to.meta.guestOnly && authStore.isAuthenticated) {
    if (authStore.role === 'superadmin') {
      next({ name: 'SuperAdmin' })
    } else {
      next({ name: 'DashboardRestaurant' })
    }
  } else {
    next()
  }
})

export default router
