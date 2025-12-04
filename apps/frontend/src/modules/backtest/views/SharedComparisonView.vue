<template>
  <div class="shared-comparison-view">
    <a-card>
      <template #title>
        <h1>{{ t('backtest.sharedComparison.loading') }}</h1>
      </template>
      <div v-if="isLoading" class="loading-container">
        <a-spin size="large" :tip="t('backtest.sharedComparison.loadingConfig')">
          <div style="height: 400px"></div>
        </a-spin>
      </div>
      <div v-else-if="error" class="error-container">
        <a-alert
          :message="error"
          type="error"
          show-icon
          closable
          @close="error = null"
        />
        <a-button type="primary" @click="goHome" style="margin-top: 16px">
          {{ t('backtest.sharedComparison.goHome') }}
        </a-button>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { useBacktestStore } from '../stores/backtestStore'
import { shareService } from '../services/shareService'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const backtestStore = useBacktestStore()

const isLoading = ref(true)
const error = ref<string | null>(null)

const loadSharedComparison = async () => {
  const shortCode = route.params.shortCode as string

  if (!shortCode) {
    error.value = t('backtest.sharedComparison.invalidCode')
    isLoading.value = false
    return
  }

  try {
    // Fetch the shared configuration
    const config = await shareService.getSharedConfig(shortCode)

    // Load configuration into store
    backtestStore.loadFromSharedConfig(config)

    // Run the comparison automatically
    await backtestStore.compareStrategies()

    // Navigate to playground page (results will be displayed there)
    if (backtestStore.hasResults) {
      router.push('/playground')
    } else {
      error.value = t('backtest.sharedComparison.comparisonFailed')
      isLoading.value = false
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : t('backtest.sharedComparison.loadFailed')
    error.value = errorMessage
    isLoading.value = false
    message.error(errorMessage)
  }
}

const goHome = () => {
      router.push('/playground')
}

onMounted(() => {
  loadSharedComparison()
})
</script>

<style scoped>
.shared-comparison-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.loading-container,
.error-container {
  text-align: center;
  padding: 48px;
}
</style>

