import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../pages/home/index.vue'
import { docsRoutes } from './docs'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    ...docsRoutes,
  ],
})

export default router
