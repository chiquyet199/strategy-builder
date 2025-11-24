<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'ant-design-vue/es/form'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'
import type { RegisterRequest } from '@/shared/types/auth'

const emit = defineEmits<{
  success: []
}>()

const authStore = useAuthStore()

const formState = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const localError = ref<string | null>(null)

const validatePasswordMatch = async (_rule: unknown, value: string) => {
  if (!value) {
    return Promise.reject('Please confirm your password')
  }
  if (value !== formState.value.password) {
    return Promise.reject('Passwords do not match')
  }
  return Promise.resolve()
}

const rules = {
  name: [{ required: true, message: 'Please enter your name', trigger: 'blur' }],
  email: [
    { required: true, message: 'Please enter your email', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Please enter your password', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: 'Please confirm your password', trigger: 'blur' },
    { validator: validatePasswordMatch, trigger: 'blur' },
  ],
}

const { validate, validateInfos } = useForm(formState, {
  rules,
  validateTrigger: ['blur', 'change'],
})

const handleSubmit = async () => {
  localError.value = null
  
  try {
    await validate()
    
    const data: RegisterRequest = {
      name: formState.value.name,
      email: formState.value.email,
      password: formState.value.password,
    }
    
    await authService.register(data)
    emit('success')
  } catch (error) {
    if (error && typeof error === 'object' && 'errorFields' in error) {
      // Validation errors are handled by form
      return
    }
    localError.value = error instanceof Error ? error.message : 'Registration failed'
  }
}
</script>

<template>
  <a-form layout="vertical" @submit.prevent="handleSubmit">
    <a-alert
      v-if="localError || authStore.error"
      :message="localError || authStore.error"
      type="error"
      show-icon
      closable
      class="mb-4"
    />

    <a-form-item label="Name" v-bind="validateInfos.name">
      <a-input
        v-model:value="formState.name"
        type="text"
        placeholder="Enter your name"
        size="large"
      />
    </a-form-item>

    <a-form-item label="Email" v-bind="validateInfos.email">
      <a-input
        v-model:value="formState.email"
        type="email"
        placeholder="Enter your email"
        size="large"
      />
    </a-form-item>

    <a-form-item label="Password" v-bind="validateInfos.password">
      <a-input-password
        v-model:value="formState.password"
        placeholder="Enter your password"
        size="large"
      />
    </a-form-item>

    <a-form-item label="Confirm Password" v-bind="validateInfos.confirmPassword">
      <a-input-password
        v-model:value="formState.confirmPassword"
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

