<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'ant-design-vue/es/form'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'

const emit = defineEmits<{
  success: []
}>()

const authStore = useAuthStore()

const formState = ref({
  email: '',
})

const localError = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const rules = {
  email: [
    { required: true, message: 'Please enter your email', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email', trigger: 'blur' },
  ],
}

const { validate, validateInfos } = useForm(formState, {
  rules,
  validateTrigger: ['blur', 'change'],
})

const handleSubmit = async () => {
  localError.value = null
  successMessage.value = null

  try {
    await validate()
    await authService.forgotPassword({ email: formState.value.email })
    successMessage.value =
      'If the email exists, a password reset link has been sent to your email address. Please check your inbox and follow the instructions to reset your password.'
    emit('success')
  } catch (error) {
    if (error && typeof error === 'object' && 'errorFields' in error) {
      return
    }
    localError.value =
      error instanceof Error ? error.message : 'Failed to send reset email'
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
      v-if="successMessage"
      :message="successMessage"
      type="success"
      show-icon
      closable
      class="mb-4"
    />

    <a-form-item label="Email" v-bind="validateInfos.email">
      <a-input
        v-model:value="formState.email"
        type="email"
        placeholder="Enter your email"
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
        Send Reset Link
      </a-button>
    </a-form-item>
  </a-form>
</template>

