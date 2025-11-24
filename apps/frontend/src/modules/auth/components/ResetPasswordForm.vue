<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForm } from 'ant-design-vue/es/form'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const formState = ref({
  newPassword: '',
  confirmPassword: '',
})

const localError = ref<string | null>(null)

// Get token from URL query parameter
const resetToken = computed(() => {
  return (route.query.token as string) || null
})

const validatePasswordMatch = async (_rule: unknown, value: string) => {
  if (!value) {
    return Promise.reject('Please confirm your password')
  }
  if (value !== formState.value.newPassword) {
    return Promise.reject('Passwords do not match')
  }
  return Promise.resolve()
}

const rules = {
  newPassword: [
    { required: true, message: 'Please enter your new password', trigger: 'blur' },
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

onMounted(() => {
  // Check if token exists in URL
  if (!resetToken.value) {
    localError.value =
      'Invalid reset link. Please request a new password reset link.'
  }
})

const handleSubmit = async () => {
  localError.value = null

  // Validate token exists
  if (!resetToken.value) {
    localError.value =
      'Invalid reset link. Please request a new password reset link.'
    return
  }

  try {
    await validate()

    await authService.resetPassword({
      token: resetToken.value,
      newPassword: formState.value.newPassword,
    })

    // Redirect to login after successful reset
    router.push({ name: 'login', query: { reset: 'success' } })
  } catch (error) {
    if (error && typeof error === 'object' && 'errorFields' in error) {
      return
    }
    localError.value =
      error instanceof Error ? error.message : 'Failed to reset password'
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

    <a-alert
      v-if="!resetToken"
      message="Invalid reset link. Please check your email and use the link provided, or request a new password reset."
      type="warning"
      show-icon
      class="mb-4"
    />

    <a-form-item label="New Password" v-bind="validateInfos.newPassword">
      <a-input-password
        v-model:value="formState.newPassword"
        placeholder="Enter your new password"
        size="large"
      />
    </a-form-item>

    <a-form-item label="Confirm Password" v-bind="validateInfos.confirmPassword">
      <a-input-password
        v-model:value="formState.confirmPassword"
        placeholder="Confirm your new password"
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
        Reset Password
      </a-button>
    </a-form-item>
  </a-form>
</template>

