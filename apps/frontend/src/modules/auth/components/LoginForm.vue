<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'ant-design-vue/es/form'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'
import type { LoginRequest } from '@/shared/types/auth'

const { t } = useI18n()
const emit = defineEmits<{
  success: []
}>()

const authStore = useAuthStore()

const formState = ref({
  email: '',
  password: '',
})

const localError = ref<string | null>(null)

const rules = {
  email: [
    { required: true, message: t('auth.login.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.login.emailInvalid'), trigger: 'blur' },
  ],
  password: [
    { required: true, message: t('auth.login.passwordRequired'), trigger: 'blur' },
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
    
    const credentials: LoginRequest = {
      email: formState.value.email,
      password: formState.value.password,
    }
    
    await authService.login(credentials)
    emit('success')
  } catch (error) {
    if (error && typeof error === 'object' && 'errorFields' in error) {
      // Validation errors are handled by form
      return
    }
    localError.value = error instanceof Error ? error.message : t('auth.login.loginFailed')
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

    <a-form-item :label="t('common.email')" v-bind="validateInfos.email">
      <a-input
        v-model:value="formState.email"
        type="email"
        :placeholder="t('auth.login.emailPlaceholder')"
        size="large"
      />
    </a-form-item>

    <a-form-item :label="t('common.password')" v-bind="validateInfos.password">
      <a-input-password
        v-model:value="formState.password"
        :placeholder="t('auth.login.passwordPlaceholder')"
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
        {{ t('auth.login.button') }}
      </a-button>
    </a-form-item>
  </a-form>
</template>

