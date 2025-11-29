<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'ant-design-vue/es/form'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'
import type { RegisterRequest } from '@/shared/types/auth'

const { t } = useI18n()
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
    return Promise.reject(t('auth.register.confirmPasswordRequired'))
  }
  if (value !== formState.value.password) {
    return Promise.reject(t('auth.register.passwordMismatch'))
  }
  return Promise.resolve()
}

const rules = {
  name: [{ required: true, message: t('auth.register.nameRequired'), trigger: 'blur' }],
  email: [
    { required: true, message: t('auth.register.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.register.emailInvalid'), trigger: 'blur' },
  ],
  password: [
    { required: true, message: t('auth.register.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('auth.register.passwordMinLength'), trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: t('auth.register.confirmPasswordRequired'), trigger: 'blur' },
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
    localError.value = error instanceof Error ? error.message : t('auth.register.registerFailed')
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

    <a-form-item :label="t('common.name')" v-bind="validateInfos.name">
      <a-input
        v-model:value="formState.name"
        type="text"
        :placeholder="t('auth.register.namePlaceholder')"
        size="large"
      />
    </a-form-item>

    <a-form-item :label="t('common.email')" v-bind="validateInfos.email">
      <a-input
        v-model:value="formState.email"
        type="email"
        :placeholder="t('auth.register.emailPlaceholder')"
        size="large"
      />
    </a-form-item>

    <a-form-item :label="t('common.password')" v-bind="validateInfos.password">
      <a-input-password
        v-model:value="formState.password"
        :placeholder="t('auth.register.passwordPlaceholder')"
        size="large"
      />
    </a-form-item>

    <a-form-item :label="t('auth.register.confirmPassword')" v-bind="validateInfos.confirmPassword">
      <a-input-password
        v-model:value="formState.confirmPassword"
        :placeholder="t('auth.register.confirmPasswordPlaceholder')"
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
        {{ t('auth.register.button') }}
      </a-button>
    </a-form-item>
  </a-form>
</template>

