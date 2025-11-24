<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'
import type { LoginRequest } from '@/shared/types/auth'

const emit = defineEmits<{
  success: []
}>()

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const localError = ref<string | null>(null)

const handleSubmit = async () => {
  localError.value = null
  
  if (!email.value || !password.value) {
    localError.value = 'Please fill in all fields'
    return
  }

  try {
    const credentials: LoginRequest = {
      email: email.value,
      password: password.value,
    }
    await authService.login(credentials)
    emit('success')
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Login failed'
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div v-if="localError || authStore.error" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
      {{ localError || authStore.error }}
    </div>

    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
        Email
      </label>
      <input
        id="email"
        v-model="email"
        type="email"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter your email"
      />
    </div>

    <div>
      <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
        Password
      </label>
      <input
        id="password"
        v-model="password"
        type="password"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter your password"
      />
    </div>

    <button
      type="submit"
      :disabled="authStore.loading"
      class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {{ authStore.loading ? 'Logging in...' : 'Login' }}
    </button>
  </form>
</template>

