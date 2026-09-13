import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/client/Home.vue'
import Menu from '@/views/client/Menu.vue'
import ProductDetails from '@/views/client/ProductDetails.vue'
import Cart from '@/views/client/Cart.vue'
import PaymentView from '@/views/client/PaymentView.vue'
import OrderConfirmation from '@/views/client/OrderConfirmation.vue'
import DashboardView from '@/views/restaurant/DashboardView.vue'

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
    path: '/restaurant',
    name: 'DashboardRestaurant',
    component: DashboardView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
