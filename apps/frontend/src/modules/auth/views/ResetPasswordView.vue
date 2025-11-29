<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ResetPasswordForm from '../components/ResetPasswordForm.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// Show success message if redirected from login
const showSuccess = route.query.reset === 'success'
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
    <a-card class="w-full max-w-md">
      <template #title>
        <h2 class="text-center text-2xl font-bold mb-0">{{ t('auth.resetPassword.title') }}</h2>
      </template>
      
      <a-alert
        v-if="showSuccess"
        :message="t('auth.resetPassword.resetSuccess')"
        type="success"
        show-icon
        closable
        class="mb-4"
      />

      <ResetPasswordForm />
      
      <div class="text-center mt-4">
        <span class="text-gray-600">{{ t('auth.resetPassword.rememberPassword') }} </span>
        <a @click="router.push('/login')" class="text-blue-500 hover:text-blue-600 cursor-pointer">
          {{ t('auth.resetPassword.signInLink') }}
        </a>
      </div>
    </a-card>
  </div>
</template>

