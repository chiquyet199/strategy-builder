<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { RouterLink } from 'vue-router'
import RegisterForm from '../components/RegisterForm.vue'
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
        <h2 class="text-center text-2xl font-bold mb-0">Create your account</h2>
      </template>
      <RegisterForm @success="handleSuccess" />
      <div class="text-center mt-4">
        <span class="text-gray-600">Already have an account? </span>
        <RouterLink to="/login" class="text-blue-500 hover:text-blue-600">
          Sign in here
        </RouterLink>
      </div>
    </a-card>
  </div>
</template>

