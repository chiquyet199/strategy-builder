<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'ant-design-vue/es/form'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'

const { t } = useI18n()
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
    { required: true, message: t('auth.forgotPassword.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.forgotPassword.emailInvalid'), trigger: 'blur' },
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
    successMessage.value = t('auth.forgotPassword.successMessage')
    emit('success')
  } catch (error) {
    if (error && typeof error === 'object' && 'errorFields' in error) {
      return
    }
    localError.value =
      error instanceof Error ? error.message : t('auth.forgotPassword.failed')
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

    <a-form-item :label="t('common.email')" v-bind="validateInfos.email">
      <a-input
        v-model:value="formState.email"
        type="email"
        :placeholder="t('auth.forgotPassword.emailPlaceholder')"
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
        {{ t('auth.forgotPassword.button') }}
      </a-button>
    </a-form-item>
  </a-form>
</template>

