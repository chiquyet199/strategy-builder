<template>
  <a-button
    :loading="isGenerating"
    :disabled="!canShare"
    @click="handleShare"
  >
    <template #icon>
      <ShareAltOutlined />
    </template>
    {{ t('backtest.results.share.shareButton') }}
  </a-button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { ShareAltOutlined } from '@ant-design/icons-vue'
import { useBacktestStore } from '../stores/backtestStore'
import { shareService } from '../services/shareService'
import type { CompareStrategiesRequest } from '@/shared/types/backtest'

const { t } = useI18n()
const backtestStore = useBacktestStore()

const isGenerating = ref(false)

const canShare = computed(() => {
  return (
    backtestStore.hasResults &&
    backtestStore.selectedStrategies.length > 0 &&
    backtestStore.startDate &&
    backtestStore.endDate
  )
})

const buildConfig = (): CompareStrategiesRequest => {
  const config: CompareStrategiesRequest = {
    startDate: backtestStore.startDate,
    endDate: backtestStore.endDate,
    strategies: backtestStore.selectedStrategies,
    timeframe: backtestStore.timeframe,
  }

  // Add initial portfolio (always required)
  config.initialPortfolio = backtestStore.initialPortfolio || {
    assets: [],
    usdcAmount: 0,
  }

  // Add funding schedule if configured
  if (backtestStore.fundingSchedule.amount > 0) {
    config.fundingSchedule = backtestStore.fundingSchedule
  }

  return config
}

const handleShare = async () => {
  if (!canShare.value) {
    return
  }

  isGenerating.value = true

  try {
    const config = buildConfig()
    // Tracking happens automatically on the backend when share is created
    const shareResponse = await shareService.generateShareUrl(config)

    // Copy to clipboard
    await shareService.copyToClipboard(shareResponse.url)

    message.success(t('backtest.results.share.shareSuccess', { url: shareResponse.url }))
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : t('backtest.results.share.shareError')
    message.error(errorMessage)
  } finally {
    isGenerating.value = false
  }
}
</script>

