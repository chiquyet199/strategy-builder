<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
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
  <div class="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>
      <div class="bg-white py-8 px-6 shadow rounded-lg">
        <LoginForm @success="handleSuccess" />
      </div>
    </div>
  </div>
</template>

