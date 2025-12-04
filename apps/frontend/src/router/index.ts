import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/authStore'
import { authService } from '@/modules/auth/services/authService'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/modules/backtest/views/HomeView.vue'),
    },
    {
      path: '/playground',
      name: 'playground',
      component: () => import('@/modules/backtest/views/PlaygroundView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/modules/auth/views/RegisterView.vue'),
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/modules/auth/views/ForgotPasswordView.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/modules/auth/views/ResetPasswordView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/modules/auth/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/s/:shortCode',
      name: 'shared-comparison',
      component: () => import('@/modules/backtest/views/SharedComparisonView.vue'),
    },
    {
      path: '/admin/analytics',
      name: 'admin-analytics',
      component: () => import('@/modules/admin/views/AnalyticsDashboard.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/modules/admin/views/UserManagementView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Initialize auth state if token exists but user hasn't been loaded yet
  if (authStore.token && !authStore.user && !authStore.initialized) {
    authStore.setInitialized(true)
    try {
      await authService.fetchProfile()
    } catch (error) {
      // Token is invalid, clear it
      authStore.setToken(null)
      authStore.setUser(null)
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.meta.requiresAdmin && !authStore.isAdmin && !authStore.isMaster) {
    // Redirect to home if not admin/master
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
