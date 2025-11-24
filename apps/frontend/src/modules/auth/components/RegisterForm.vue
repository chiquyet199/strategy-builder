<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'
import type { RegisterRequest } from '@/shared/types/auth'

const emit = defineEmits<{
  success: []
}>()

const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const localError = ref<string | null>(null)

const validatePasswordMatch = (_rule: any, value: string) => {
  if (!value) {
    return Promise.reject('Please confirm your password')
  }
  if (value !== password.value) {
    return Promise.reject('Passwords do not match')
  }
  return Promise.resolve()
}

const handleSubmit = async () => {
  localError.value = null
  
  if (!name.value || !email.value || !password.value || !confirmPassword.value) {
    localError.value = 'Please fill in all fields'
    return
  }

  if (password.value !== confirmPassword.value) {
    localError.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 6) {
    localError.value = 'Password must be at least 6 characters'
    return
  }

  try {
    const data: RegisterRequest = {
      name: name.value,
      email: email.value,
      password: password.value,
    }
    await authService.register(data)
    emit('success')
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Registration failed'
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

    <a-form-item label="Name" name="name" :rules="[{ required: true, message: 'Please enter your name' }]">
      <a-input
        v-model:value="name"
        type="text"
        placeholder="Enter your name"
        size="large"
      />
    </a-form-item>

    <a-form-item label="Email" name="email" :rules="[{ required: true, type: 'email', message: 'Please enter a valid email' }]">
      <a-input
        v-model:value="email"
        type="email"
        placeholder="Enter your email"
        size="large"
      />
    </a-form-item>

    <a-form-item label="Password" name="password" :rules="[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]">
      <a-input-password
        v-model:value="password"
        placeholder="Enter your password"
        size="large"
      />
    </a-form-item>

    <a-form-item label="Confirm Password" name="confirmPassword" :rules="[
      { required: true, message: 'Please confirm your password' },
      { validator: validatePasswordMatch }
    ]">
      <a-input-password
        v-model:value="confirmPassword"
        placeholder="Confirm your password"
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
        Register
      </a-button>
    </a-form-item>
  </a-form>
</template>

