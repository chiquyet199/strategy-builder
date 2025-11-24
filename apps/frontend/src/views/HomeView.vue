<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TheWelcome from '../components/TheWelcome.vue'
import { api, type HealthResponse } from '../services/api'

const healthStatus = ref<HealthResponse | null>(null)
const healthError = ref<string | null>(null)
const isLoading = ref(false)

const checkBackendHealth = async () => {
  isLoading.value = true
  healthError.value = null
  try {
    healthStatus.value = await api.getHealth()
  } catch (error) {
    healthError.value = error instanceof Error ? error.message : 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  checkBackendHealth()
})
</script>

<template>
  <main class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold text-gray-800 mb-4">Welcome to Vue 3 + Tailwind CSS</h1>
      <p class="text-lg text-gray-600 mb-8">Tailwind CSS is now configured and ready to use!</p>
      
      <!-- Backend Connection Status -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Backend Connection</h2>
        <div v-if="isLoading" class="text-gray-600">Checking backend connection...</div>
        <div v-else-if="healthError" class="bg-red-50 border border-red-200 rounded p-4">
          <p class="text-red-800 font-semibold">Connection Error</p>
          <p class="text-red-600 text-sm mt-1">{{ healthError }}</p>
          <p class="text-gray-600 text-xs mt-2">Make sure the backend server is running on port 3000</p>
        </div>
        <div v-else-if="healthStatus" class="bg-green-50 border border-green-200 rounded p-4">
          <p class="text-green-800 font-semibold">✓ Backend Connected</p>
          <p class="text-green-600 text-sm mt-1">{{ healthStatus.message }}</p>
          <p class="text-gray-600 text-xs mt-2">Last checked: {{ new Date(healthStatus.timestamp).toLocaleString() }}</p>
        </div>
        <button
          @click="checkBackendHealth"
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh Status
        </button>
      </div>

      <TheWelcome />
    </div>
  </main>
</template>
