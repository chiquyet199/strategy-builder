<template>
  <div class="strategy-preview">
    <!-- Preview Header -->
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold">Live Preview</h3>
      <a-button type="primary" :loading="isLoading" @click="handlePreview"> Run Preview </a-button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8">
      <a-spin size="large" />
      <p class="mt-4 text-gray-500">Analyzing strategy triggers...</p>
    </div>

    <!-- Preview Results -->
    <div v-else-if="previewResult" class="space-y-6">
      <!-- Summary Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="text-sm text-gray-600">Total Triggers</div>
          <div class="text-2xl font-bold text-blue-600">{{ previewResult.totalTriggers }}</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <div class="text-sm text-gray-600">Active Rules</div>
          <div class="text-2xl font-bold text-green-600">
            {{ previewResult.ruleSummaries.length }}
          </div>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg">
          <div class="text-sm text-gray-600">Date Range</div>
          <div class="text-sm font-semibold text-purple-600">{{ formatDateRange }}</div>
        </div>
      </div>

      <!-- Chart with Trigger Points -->
      <div class="bg-white border rounded-lg p-4">
        <h4 class="text-md font-semibold mb-4">Price Chart with Trigger Points</h4>
        <CandlestickChartWithTriggers
          :candles="previewResult.candles"
          :trigger-points="allTriggerPoints"
        />
      </div>

      <!-- Rule Summaries -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold">Trigger Details by Rule</h4>
        <div
          v-for="summary in previewResult.ruleSummaries"
          :key="summary.ruleId"
          class="bg-white border rounded-lg p-4"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <h5 class="font-semibold">{{ summary.ruleName || `Rule ${summary.ruleId}` }}</h5>
              <span class="text-sm text-gray-500">Rule ID: {{ summary.ruleId }}</span>
            </div>
            <a-tag color="blue" class="text-lg font-semibold">
              {{ summary.triggerCount }} {{ summary.triggerCount === 1 ? 'trigger' : 'triggers' }}
            </a-tag>
          </div>

          <!-- Trigger Points List -->
          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="(trigger, index) in summary.triggerPoints"
              :key="index"
              class="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50 rounded"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-sm">
                  {{ formatDate(trigger.date) }} @ ${{ trigger.price.toLocaleString() }}
                </span>
                <a-tag v-if="trigger.severity" color="orange" size="small">
                  Severity: {{ (trigger.severity * 100).toFixed(0) }}%
                </a-tag>
              </div>
              <div class="text-sm text-gray-700 mb-1">
                <strong>Condition:</strong> {{ trigger.conditionMet }}
              </div>
              <div class="text-sm text-gray-700">
                <strong>Actions:</strong>
                <ul class="list-disc list-inside ml-2 mt-1">
                  <li v-for="(action, actionIndex) in trigger.actionsExecuted" :key="actionIndex">
                    {{ action }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Triggers Message -->
      <div
        v-if="previewResult.totalTriggers === 0"
        class="text-center py-8 bg-yellow-50 rounded-lg"
      >
        <p class="text-yellow-800 font-medium">No triggers found in the selected date range.</p>
        <p class="text-sm text-yellow-600 mt-2">
          Try adjusting your conditions or selecting a different date range.
        </p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-800 font-medium">Preview failed</p>
      <p class="text-sm text-red-600 mt-1">{{ error }}</p>
    </div>

    <!-- Initial State -->
    <div v-else class="text-center py-8 text-gray-500">
      <p>Click "Run Preview" to see how your strategy would perform</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button as AButton, Spin as ASpin, Tag as ATag } from 'ant-design-vue'
import {
  strategyBuilderApi,
  type StrategyPreviewResult,
  type TriggerPoint,
} from '../api/strategyBuilderApi'
import type { CustomStrategyConfig } from '../api/strategyBuilderApi'
import CandlestickChartWithTriggers from './CandlestickChartWithTriggers.vue'
import dayjs from 'dayjs'

interface Props {
  strategyConfig: CustomStrategyConfig
  startDate?: string
  endDate?: string
  investmentAmount?: number
}

const props = defineProps<Props>()

const isLoading = ref(false)
const previewResult = ref<StrategyPreviewResult | null>(null)
const error = ref<string | null>(null)

// Default date range: last 1 year
const defaultStartDate = computed(() => {
  return props.startDate || dayjs().subtract(1, 'year').startOf('month').toISOString()
})

const defaultEndDate = computed(() => {
  return props.endDate || dayjs().startOf('month').toISOString()
})

const formatDateRange = computed(() => {
  if (!previewResult.value) return ''
  const start = dayjs(defaultStartDate.value).format('MMM YYYY')
  const end = dayjs(defaultEndDate.value).format('MMM YYYY')
  return `${start} - ${end}`
})

const allTriggerPoints = computed(() => {
  if (!previewResult.value) return []
  return previewResult.value.ruleSummaries.flatMap((summary) => summary.triggerPoints)
})

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('MMM DD, YYYY')
}

const handlePreview = async () => {
  isLoading.value = true
  error.value = null
  previewResult.value = null

  try {
    const result = await strategyBuilderApi.preview(props.strategyConfig, {
      startDate: defaultStartDate.value,
      endDate: defaultEndDate.value,
      timeframe: '1d',
      investmentAmount: props.investmentAmount || 10000,
    })
    previewResult.value = result
  } catch (err: any) {
    error.value = err.message || 'Failed to preview strategy'
    console.error('Preview error:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.strategy-preview {
  @apply w-full;
}
</style>
