<script setup lang="ts">
import { useRouter } from 'vue-router'
import ForgotPasswordForm from '../components/ForgotPasswordForm.vue'

const router = useRouter()

const handleSuccess = () => {
  // User will receive email with reset link
  // No redirect needed - success message is shown in the form
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
    <a-card class="w-full max-w-md">
      <template #title>
        <h2 class="text-center text-2xl font-bold mb-0">Forgot Password</h2>
      </template>
      <ForgotPasswordForm @success="handleSuccess" />
      <div class="text-center mt-4">
        <span class="text-gray-600">Remember your password? </span>
        <a @click="router.push('/login')" class="text-blue-500 hover:text-blue-600 cursor-pointer">
          Sign in here
        </a>
      </div>
    </a-card>
  </div>
</template>

