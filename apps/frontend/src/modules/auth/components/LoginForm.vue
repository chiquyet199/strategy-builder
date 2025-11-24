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
  <a-form @submit.prevent="handleSubmit" layout="vertical">
    <a-alert
      v-if="localError || authStore.error"
      :message="localError || authStore.error"
      type="error"
      show-icon
      closable
      class="mb-4"
    />

    <a-form-item label="Email" name="email" :rules="[{ required: true, type: 'email', message: 'Please enter a valid email' }]">
      <a-input
        v-model:value="email"
        type="email"
        placeholder="Enter your email"
        size="large"
      />
    </a-form-item>

    <a-form-item label="Password" name="password" :rules="[{ required: true, message: 'Please enter your password' }]">
      <a-input-password
        v-model:value="password"
        placeholder="Enter your password"
        size="large"
      />
    </a-form-item>

    <a-form-item>
      <a-button
        type="primary"
        html-type="submit"
        :loading="authStore.loading"
        block
        size="large"
      >
        Login
      </a-button>
    </a-form-item>
  </a-form>
</template>

