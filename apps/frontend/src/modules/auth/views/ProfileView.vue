<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  if (!authStore.token) {
    router.push('/login')
    return
  }

  if (!authStore.user) {
    try {
      await authService.fetchProfile()
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      router.push('/login')
    }
  }
})

const handleLogout = () => {
  authService.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-3xl mx-auto">
      <a-card>
        <template #title>
          <div class="flex justify-between items-center">
            <span>{{ t('auth.profile.title') }}</span>
            <a-button type="primary" danger @click="handleLogout">
              {{ t('common.logout') }}
            </a-button>
          </div>
        </template>

        <a-spin :spinning="authStore.loading" :tip="t('auth.profile.loadingProfile')">
          <a-descriptions v-if="authStore.user" bordered :column="1">
            <a-descriptions-item :label="t('auth.profile.id')">
              {{ authStore.user.id }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('auth.profile.name')">
              {{ authStore.user.name }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('auth.profile.email')">
              {{ authStore.user.email }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('auth.profile.createdAt')">
              {{ new Date(authStore.user.createdAt).toLocaleString() }}
            </a-descriptions-item>
          </a-descriptions>

          <a-empty v-else :description="t('auth.profile.loadFailed')" />
        </a-spin>
      </a-card>
    </div>
  </div>
</template>

