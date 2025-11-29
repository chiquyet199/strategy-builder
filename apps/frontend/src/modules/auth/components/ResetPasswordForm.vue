<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForm } from 'ant-design-vue/es/form'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'

const { t } = useI18n()
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
    return Promise.reject(t('auth.resetPassword.confirmPasswordRequired'))
  }
  if (value !== formState.value.newPassword) {
    return Promise.reject(t('auth.resetPassword.passwordMismatch'))
  }
  return Promise.resolve()
}

const rules = {
  newPassword: [
    { required: true, message: t('auth.resetPassword.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('auth.resetPassword.passwordMinLength'), trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: t('auth.resetPassword.confirmPasswordRequired'), trigger: 'blur' },
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
    localError.value = t('auth.resetPassword.invalidToken')
  }
})

const handleSubmit = async () => {
  localError.value = null

  // Validate token exists
  if (!resetToken.value) {
    localError.value = t('auth.resetPassword.invalidToken')
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
      error instanceof Error ? error.message : t('auth.resetPassword.resetFailed')
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
      :message="t('auth.resetPassword.invalidTokenMessage')"
      type="warning"
      show-icon
      class="mb-4"
    />

    <a-form-item :label="t('auth.resetPassword.newPassword')" v-bind="validateInfos.newPassword">
      <a-input-password
        v-model:value="formState.newPassword"
        :placeholder="t('auth.resetPassword.newPasswordPlaceholder')"
        size="large"
      />
    </a-form-item>

    <a-form-item :label="t('auth.resetPassword.confirmPassword')" v-bind="validateInfos.confirmPassword">
      <a-input-password
        v-model:value="formState.confirmPassword"
        :placeholder="t('auth.resetPassword.confirmPasswordPlaceholder')"
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
        {{ t('auth.resetPassword.button') }}
      </a-button>
    </a-form-item>
  </a-form>
</template>

