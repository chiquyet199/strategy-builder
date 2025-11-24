<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  if (!authStore.token) {
    router.push('/login')
    return
  }

  if (!authStore.user) {
    try {
      await authService.fetchProfile()
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      router.push('/login')
    }
  }
})

const handleLogout = () => {
  authService.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto">
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold text-gray-900">Profile</h1>
          <button
            @click="handleLogout"
            class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Logout
          </button>
        </div>

        <div v-if="authStore.loading" class="text-center py-8">
          <p class="text-gray-600">Loading profile...</p>
        </div>

        <div v-else-if="authStore.user" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">ID</label>
            <p class="mt-1 text-sm text-gray-900">{{ authStore.user.id }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <p class="mt-1 text-sm text-gray-900">{{ authStore.user.name }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Email</label>
            <p class="mt-1 text-sm text-gray-900">{{ authStore.user.email }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Created At</label>
            <p class="mt-1 text-sm text-gray-900">
              {{ new Date(authStore.user.createdAt).toLocaleString() }}
            </p>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <p class="text-red-600">Failed to load profile</p>
        </div>
      </div>
    </div>
  </div>
</template>

