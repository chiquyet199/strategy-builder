import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/shared/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // Synchronous actions only - state updates
  function setToken(newToken: string | null): void {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
    }
  }

  function setUser(newUser: User | null): void {
    user.value = newUser
  }

  function setLoading(isLoading: boolean): void {
    loading.value = isLoading
  }

  function setError(errorMessage: string | null): void {
    error.value = errorMessage
  }

  function setInitialized(value: boolean): void {
    initialized.value = value
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    initialized,
    // Computed
    isAuthenticated,
    // Actions (synchronous only)
    setToken,
    setUser,
    setLoading,
    setError,
    setInitialized,
  }
})

