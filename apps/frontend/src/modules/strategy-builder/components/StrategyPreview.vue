<template>
  <div class="strategy-preview">
    <!-- Preview Header with Controls -->
    <div class="mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold">Live Preview</h3>
        <a-button type="primary" :loading="isLoading" @click="handlePreview">
          Run Preview
        </a-button>
      </div>

      <!-- Editable Settings -->
      <div class="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg">
        <!-- Date Range -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Period:</span>
          <a-range-picker
            v-model:value="dateRange"
            :format="'YYYY-MM-DD'"
            size="small"
            :allow-clear="false"
            @change="handleDateRangeChange"
          />
        </div>

        <!-- Timeframe -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Timeframe:</span>
          <a-radio-group
            v-model:value="selectedApiTimeframe"
            size="small"
            button-style="solid"
            @change="handleTimeframeChangeFromSelector"
          >
            <a-radio-button value="1h">1H</a-radio-button>
            <a-radio-button value="4h">4H</a-radio-button>
            <a-radio-button value="1d">1D</a-radio-button>
            <a-radio-button value="1w">1W</a-radio-button>
          </a-radio-group>
        </div>

        <!-- Settings Changed Indicator -->
        <div v-if="hasSettingsChanged" class="flex items-center gap-1 text-orange-500">
          <ExclamationCircleOutlined />
          <span class="text-xs">Settings modified</span>
        </div>
      </div>
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
          :timeframe="selectedChartTimeframe"
          :timeframes="availableChartTimeframes"
          :show-timeframe-selector="false"
          :loading="isChangingTimeframe"
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
import { ref, computed, watch } from 'vue'
import {
  Button as AButton,
  Spin as ASpin,
  Tag as ATag,
  RangePicker as ARangePicker,
  RadioGroup as ARadioGroup,
  RadioButton as ARadioButton,
} from 'ant-design-vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import {
  strategyBuilderApi,
  type StrategyPreviewResult,
} from '../api/strategyBuilderApi'
import type { CustomStrategyConfig } from '../api/strategyBuilderApi'
import type { Timeframe } from '@/shared/types/chart'
import CandlestickChartWithTriggers from './CandlestickChartWithTriggers.vue'
import dayjs, { type Dayjs } from 'dayjs'

// API timeframe format (lowercase)
type ApiTimeframe = '1h' | '4h' | '1d' | '1w' | '1m'

interface Props {
  strategyConfig: CustomStrategyConfig
  startDate?: string
  endDate?: string
  investmentAmount?: number
  /** Initial timeframe (accepts both '1d' and '1D' formats) */
  timeframe?: string
}

const props = withDefaults(defineProps<Props>(), {
  timeframe: '1d',
})

interface Emits {
  (e: 'settings-change', settings: { startDate: string; endDate: string; timeframe: string }): void
}

const emit = defineEmits<Emits>()

const isLoading = ref(false)
const isChangingTimeframe = ref(false)
const previewResult = ref<StrategyPreviewResult | null>(null)
const error = ref<string | null>(null)

// Store original values to detect changes
const originalStartDate = ref<string>('')
const originalEndDate = ref<string>('')
const originalTimeframe = ref<string>('')

// Current editable values
const selectedApiTimeframe = ref<ApiTimeframe>(normalizeTimeframe(props.timeframe))
const dateRange = ref<[Dayjs, Dayjs]>([
  dayjs(props.startDate || dayjs().subtract(1, 'year')),
  dayjs(props.endDate || dayjs()),
])

// Initialize original values when props change
watch(
  () => [props.startDate, props.endDate, props.timeframe],
  () => {
    const start = props.startDate || dayjs().subtract(1, 'year').toISOString()
    const end = props.endDate || dayjs().toISOString()
    const tf = props.timeframe || '1d'

    // Set original values (only once when modal opens)
    if (!originalStartDate.value) {
      originalStartDate.value = start
      originalEndDate.value = end
      originalTimeframe.value = normalizeTimeframe(tf)
    }

    // Update current values
    dateRange.value = [dayjs(start), dayjs(end)]
    selectedApiTimeframe.value = normalizeTimeframe(tf)
  },
  { immediate: true }
)

// Normalize timeframe to API format
function normalizeTimeframe(tf: string): ApiTimeframe {
  const lower = tf.toLowerCase()
  if (['1h', '4h', '1d', '1w', '1m'].includes(lower)) {
    return lower as ApiTimeframe
  }
  // Handle uppercase formats
  const map: Record<string, ApiTimeframe> = {
    '1D': '1d',
    '1W': '1w',
    '1M': '1m',
  }
  return map[tf] || '1d'
}

// Convert API timeframe to chart format
const apiToChartTimeframe: Record<ApiTimeframe, Timeframe> = {
  '1h': '1h',
  '4h': '4h',
  '1d': '1D',
  '1w': '1W',
  '1m': '1M',
}

// Selected timeframe in chart format
const selectedChartTimeframe = computed<Timeframe>(() => {
  return apiToChartTimeframe[selectedApiTimeframe.value] || '1D'
})

// Available timeframes for the chart
const availableChartTimeframes: Timeframe[] = ['1h', '4h', '1D', '1W']

// Check if settings have changed from original
const hasSettingsChanged = computed(() => {
  if (!originalStartDate.value) return false

  const currentStart = dateRange.value[0].format('YYYY-MM-DD')
  const currentEnd = dateRange.value[1].format('YYYY-MM-DD')
  const originalStart = dayjs(originalStartDate.value).format('YYYY-MM-DD')
  const originalEnd = dayjs(originalEndDate.value).format('YYYY-MM-DD')

  return (
    currentStart !== originalStart ||
    currentEnd !== originalEnd ||
    selectedApiTimeframe.value !== originalTimeframe.value
  )
})

// Expose current settings and change status for parent
defineExpose({
  getCurrentSettings: () => ({
    startDate: dateRange.value[0].toISOString(),
    endDate: dateRange.value[1].toISOString(),
    timeframe: selectedApiTimeframe.value,
  }),
  getOriginalSettings: () => ({
    startDate: originalStartDate.value,
    endDate: originalEndDate.value,
    timeframe: originalTimeframe.value,
  }),
  hasSettingsChanged: () => hasSettingsChanged.value,
})

// Effective dates for API
const effectiveStartDate = computed(() => dateRange.value[0].toISOString())
const effectiveEndDate = computed(() => dateRange.value[1].toISOString())

const formatDateRange = computed(() => {
  if (!previewResult.value) return ''
  const start = dateRange.value[0].format('MMM YYYY')
  const end = dateRange.value[1].format('MMM YYYY')
  return `${start} - ${end}`
})

const allTriggerPoints = computed(() => {
  if (!previewResult.value) return []
  return previewResult.value.ruleSummaries.flatMap((summary) => summary.triggerPoints)
})

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('MMM DD, YYYY')
}

/**
 * Fetch preview data from API
 */
async function fetchPreview() {
  const result = await strategyBuilderApi.preview(props.strategyConfig, {
    startDate: effectiveStartDate.value,
    endDate: effectiveEndDate.value,
    timeframe: selectedApiTimeframe.value,
    investmentAmount: props.investmentAmount || 10000,
  })

  return result
}

/**
 * Handle initial preview button click
 */
const handlePreview = async () => {
  isLoading.value = true
  error.value = null
  previewResult.value = null

  try {
    previewResult.value = await fetchPreview()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to preview strategy'
    console.error('Preview error:', err)
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle date range change
 */
function handleDateRangeChange() {
  emitSettingsChange()
  // Re-fetch if we have results
  if (previewResult.value) {
    refetchPreview()
  }
}

/**
 * Handle timeframe change from the selector
 */
function handleTimeframeChangeFromSelector() {
  emitSettingsChange()
  // Re-fetch if we have results
  if (previewResult.value) {
    refetchPreview()
  }
}

/**
 * Re-fetch preview with new settings
 */
async function refetchPreview() {
  isChangingTimeframe.value = true
  error.value = null

  try {
    previewResult.value = await fetchPreview()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch data'
    console.error('Refetch error:', err)
  } finally {
    isChangingTimeframe.value = false
  }
}

/**
 * Emit settings change event
 */
function emitSettingsChange() {
  emit('settings-change', {
    startDate: effectiveStartDate.value,
    endDate: effectiveEndDate.value,
    timeframe: selectedApiTimeframe.value,
  })
}
</script>

<style scoped>
.strategy-preview {
  @apply w-full;
}
</style>
