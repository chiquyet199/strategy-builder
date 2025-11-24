<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { RouterLink } from 'vue-router'
import LoginForm from '../components/LoginForm.vue'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push('/profile')
  }
})

const handleSuccess = () => {
  router.push('/profile')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
    <a-card class="w-full max-w-md">
      <template #title>
        <h2 class="text-center text-2xl font-bold mb-0">Sign in to your account</h2>
      </template>
      <LoginForm @success="handleSuccess" />
      <div class="text-center mt-4 space-y-2">
        <div>
          <RouterLink to="/forgot-password" class="text-blue-500 hover:text-blue-600">
            Forgot your password?
          </RouterLink>
        </div>
        <div>
          <span class="text-gray-600">Don't have an account? </span>
          <RouterLink to="/register" class="text-blue-500 hover:text-blue-600">
            Register here
          </RouterLink>
        </div>
      </div>
    </a-card>
  </div>
</template>

