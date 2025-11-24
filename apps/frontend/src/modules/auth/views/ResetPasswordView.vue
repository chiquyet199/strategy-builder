<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import ResetPasswordForm from '../components/ResetPasswordForm.vue'

const route = useRoute()
const router = useRouter()

// Show success message if redirected from login
const showSuccess = route.query.reset === 'success'
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
    <a-card class="w-full max-w-md">
      <template #title>
        <h2 class="text-center text-2xl font-bold mb-0">Reset Password</h2>
      </template>
      
      <a-alert
        v-if="showSuccess"
        message="Password reset successful! You can now login with your new password."
        type="success"
        show-icon
        closable
        class="mb-4"
      />

      <ResetPasswordForm />
      
      <div class="text-center mt-4">
        <span class="text-gray-600">Remember your password? </span>
        <a @click="router.push('/login')" class="text-blue-500 hover:text-blue-600 cursor-pointer">
          Sign in here
        </a>
      </div>
    </a-card>
  </div>
</template>

