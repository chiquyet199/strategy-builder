<template>
  <div class="preview-panel-container">
    <!-- Settings Bar -->
    <div class="settings-bar">
      <div class="settings-left pr-8">
        <div class="setting-group timeframe-group">
          <a-radio-group
            v-model:value="selectedTimeframe"
            size="small"
            button-style="solid"
            @change="handleTimeframeChange"
          >
            <a-radio-button value="1h">1H</a-radio-button>
            <a-radio-button value="4h">4H</a-radio-button>
            <a-radio-button value="1d">1D</a-radio-button>
            <a-radio-button value="1w">1W</a-radio-button>
          </a-radio-group>
        </div>
        <div class="setting-group slider-group ml-4 pt-2">
          <div class="slider-container">
            <DateRangeSlider
              ref="dateRangeSliderRef"
              :initial-start-date="startDateISO"
              :initial-end-date="endDateISO"
              @change="handleDateRangeSliderChange"
            />
          </div>
        </div>
      </div>
      <div class="settings-right">
        <a-button type="primary" :loading="isLoading" @click="runPreview">
          <template #icon><PlayCircleOutlined /></template>
          Run Preview
        </a-button>
      </div>
    </div>

    <!-- Date Range Limit Notice -->
    <div v-if="rangeLimitMessage" class="range-limit-notice">
      <InfoCircleOutlined />
      <span>{{ rangeLimitMessage }}</span>
      <a-button
        v-if="suggestedTimeframe"
        type="link"
        size="small"
        @click="switchToSuggestedTimeframe"
      >
        Switch to {{ suggestedTimeframe.toUpperCase() }}
      </a-button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <a-spin size="large" />
      <p>Analyzing strategy triggers...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <a-alert type="error" :message="error" show-icon />
    </div>

    <!-- Preview Content -->
    <div v-else-if="previewResult" class="preview-content">
      <!-- Chart -->
      <div ref="chartSectionRef" class="chart-section">
        <CandlestickChartWithTriggers
          :candles="previewResult.candles"
          :trigger-points="allTriggerPoints"
          :rule-colors="ruleColors"
          :height="chartHeight"
          :show-timeframe-selector="false"
          :default-visible-days="defaultVisibleDays"
        />
      </div>

      <!-- Trigger Details by Rule (hidden for now) -->
      <!-- <div class="triggers-section">
        <h3 class="section-title">Trigger Details</h3>
        <div class="triggers-list">
          <a-collapse v-model:activeKey="expandedRules" :bordered="false">
            <a-collapse-panel
              v-for="summary in previewResult.ruleSummaries"
              :key="summary.ruleId"
              :header="null"
            >
              <template #header>
                <div class="trigger-header">
                  <div class="trigger-header-left">
                    <div
                      class="color-dot"
                      :style="{ backgroundColor: ruleColors.get(summary.ruleId) || '#666' }"
                    ></div>
                    <span class="trigger-rule-name">
                      {{ summary.ruleName || `Rule ${getRuleNumber(summary.ruleId)}` }}
                    </span>
                  </div>
                  <a-tag :color="getTagColor(summary.triggerCount)">
                    {{ summary.triggerCount }} triggers
                  </a-tag>
                </div>
              </template>
              <div class="trigger-list">
                <div
                  v-for="(trigger, idx) in summary.triggerPoints.slice(0, 10)"
                  :key="idx"
                  class="trigger-item"
                >
                  <div class="trigger-date">
                    {{ formatDate(trigger.date) }}
                  </div>
                  <div class="trigger-price">
                    @ ${{ trigger.price.toLocaleString() }}
                  </div>
                  <div class="trigger-action">
                    {{ trigger.actionsExecuted.join(', ') }}
                  </div>
                </div>
                <div
                  v-if="summary.triggerPoints.length > 10"
                  class="trigger-more"
                >
                  + {{ summary.triggerPoints.length - 10 }} more triggers
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div> -->
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <LineChartOutlined style="font-size: 48px; color: #d9d9d9" />
      <p>Click "Run Preview" to analyze your strategy</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  RadioGroup as ARadioGroup,
  RadioButton as ARadioButton,
  Button as AButton,
  Spin as ASpin,
  Alert as AAlert,
} from 'ant-design-vue'
import {
  InfoCircleOutlined,
  PlayCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons-vue'
import CandlestickChartWithTriggers from './CandlestickChartWithTriggers.vue'
import DateRangeSlider from '@/modules/backtest/components/DateRangeSlider.vue'
import {
  strategyBuilderApi,
  type CustomStrategyConfig,
  type StrategyPreviewResult,
  type RuleTriggerSummary,
  type TriggerPoint,
} from '../api/strategyBuilderApi'
import dayjs from 'dayjs'
import {
  validateDateRangeForTimeframe,
  getDefaultVisibleDays,
  type TimeframeLimitKey,
} from '@/shared/utils/timeframe-limits'

interface Props {
  strategyConfig: CustomStrategyConfig
  startDate?: string
  endDate?: string
  timeframe?: string
  ruleColors: Map<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  timeframe: '1d',
})

const emit = defineEmits<{
  'preview-result': [summaries: RuleTriggerSummary[]]
  'settings-change': [settings: { startDate: string; endDate: string; timeframe: string }]
}>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const previewResult = ref<StrategyPreviewResult | null>(null)
const expandedRules = ref<string[]>([])
const chartSectionRef = ref<HTMLElement | null>(null)
const chartHeight = ref(400)
const dateRangeSliderRef = ref<{ setRange: (start: string, end: string) => void } | null>(null)
let resizeObserver: ResizeObserver | null = null

// Range limit feedback
const rangeLimitMessage = ref<string | null>(null)
const suggestedTimeframe = ref<TimeframeLimitKey | null>(null)

// Original settings
const originalStartDate = ref<string>('')
const originalEndDate = ref<string>('')
const originalTimeframe = ref<string>('')

// Current settings
const selectedTimeframe = ref<string>(props.timeframe?.toLowerCase() || '1d')
const startDateISO = ref<string>(props.startDate || dayjs().subtract(1, 'year').toISOString())
const endDateISO = ref<string>(props.endDate || dayjs().toISOString())

// Initialize original values and validate range
watch(
  () => [props.startDate, props.endDate, props.timeframe],
  () => {
    const start = props.startDate || dayjs().subtract(1, 'year').toISOString()
    const end = props.endDate || dayjs().toISOString()
    const tf = (props.timeframe || '1d').toLowerCase()

    if (!originalStartDate.value) {
      originalStartDate.value = start
      originalEndDate.value = end
      originalTimeframe.value = tf
    }

    startDateISO.value = start
    endDateISO.value = end
    selectedTimeframe.value = tf

    // Validate on initial load (don't show message initially, just adjust)
    nextTick(() => {
      validateAndAdjustDateRange(false)
    })
  },
  { immediate: true }
)

// Computed
const hasSettingsChanged = computed(() => {
  if (!originalStartDate.value) return false

  const currentStart = dayjs(startDateISO.value).format('YYYY-MM-DD')
  const currentEnd = dayjs(endDateISO.value).format('YYYY-MM-DD')
  const origStart = dayjs(originalStartDate.value).format('YYYY-MM-DD')
  const origEnd = dayjs(originalEndDate.value).format('YYYY-MM-DD')

  return (
    currentStart !== origStart ||
    currentEnd !== origEnd ||
    selectedTimeframe.value !== originalTimeframe.value
  )
})

const allTriggerPoints = computed<TriggerPoint[]>(() => {
  if (!previewResult.value) return []
  return previewResult.value.ruleSummaries.flatMap((s) => s.triggerPoints)
})

// Get default visible days based on selected timeframe
const defaultVisibleDays = computed(() => {
  return getDefaultVisibleDays(selectedTimeframe.value)
})

/**
 * Validate current date range against timeframe limits
 * Auto-adjusts if necessary and shows feedback
 */
function validateAndAdjustDateRange(showMessage = true): void {
  const validation = validateDateRangeForTimeframe(
    startDateISO.value,
    endDateISO.value,
    selectedTimeframe.value
  )

  if (validation.wasAdjusted) {
    // Update to adjusted range
    startDateISO.value = validation.adjustedStartDate

    // Update the slider component if it has a setRange method
    if (dateRangeSliderRef.value?.setRange) {
      dateRangeSliderRef.value.setRange(
        validation.adjustedStartDate,
        validation.adjustedEndDate
      )
    }

    if (showMessage) {
      rangeLimitMessage.value = validation.message || null
      suggestedTimeframe.value = validation.limit.suggestedTimeframe || null
    }
  } else {
    rangeLimitMessage.value = null
    suggestedTimeframe.value = null
  }
}

function handleSettingsChange() {
  emit('settings-change', {
    startDate: startDateISO.value,
    endDate: endDateISO.value,
    timeframe: selectedTimeframe.value,
  })
}

function handleTimeframeChange() {
  // Validate date range for new timeframe
  validateAndAdjustDateRange()
  handleSettingsChange()
}

function handleDateRangeSliderChange(range: { startDate: string; endDate: string }) {
  startDateISO.value = range.startDate
  endDateISO.value = range.endDate
  
  // Validate the new range against current timeframe
  validateAndAdjustDateRange()
  handleSettingsChange()
}

function switchToSuggestedTimeframe() {
  if (suggestedTimeframe.value) {
    selectedTimeframe.value = suggestedTimeframe.value
    rangeLimitMessage.value = null
    suggestedTimeframe.value = null
    handleSettingsChange()
  }
}

// Recalculate chart height based on container
function recalculateChartHeight() {
  if (chartSectionRef.value) {
    const height = chartSectionRef.value.clientHeight
    if (height > 0) {
      chartHeight.value = height
    }
  }
}

async function runPreview() {
  isLoading.value = true
  error.value = null

  try {
    const result = await strategyBuilderApi.preview(props.strategyConfig, {
      startDate: startDateISO.value,
      endDate: endDateISO.value,
      timeframe: selectedTimeframe.value as '1h' | '4h' | '1d' | '1w' | '1m',
      investmentAmount: 10000,
    })

    previewResult.value = result
    emit('preview-result', result.ruleSummaries)

    // Auto-expand first rule with triggers
    const firstWithTriggers = result.ruleSummaries.find((s) => s.triggerCount > 0)
    if (firstWithTriggers) {
      expandedRules.value = [firstWithTriggers.ruleId]
    }

    // Recalculate chart height after DOM updates
    await nextTick()
    // Use requestAnimationFrame to ensure layout is complete
    requestAnimationFrame(() => {
      recalculateChartHeight()
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to preview strategy'
  } finally {
    isLoading.value = false
  }
}

// Setup resize observer for dynamic chart height
onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      // Use the available height minus some padding for the chart
      const availableHeight = entry.contentRect.height
      if (availableHeight > 0) {
        chartHeight.value = availableHeight
      }
    }
  })

  // Observe the chart section when it becomes available
  watch(
    chartSectionRef,
    (el) => {
      if (el && resizeObserver) {
        resizeObserver.observe(el)
      }
    },
    { immediate: true }
  )
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

// Expose for parent
defineExpose({
  getCurrentSettings: () => ({
    startDate: startDateISO.value,
    endDate: endDateISO.value,
    timeframe: selectedTimeframe.value,
  }),
  hasSettingsChanged: () => hasSettingsChanged.value,
})
</script>

<style scoped>
.preview-panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.settings-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  gap: 16px;
}

.settings-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.timeframe-group {
  flex-shrink: 0;
}

.slider-group {
  flex: 1;
  min-width: 200px;
}

.slider-container {
  flex: 1;
  min-width: 150px;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-label {
  font-size: 13px;
  color: #666;
}

.settings-changed {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fa8c16;
  font-size: 12px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
  color: #999;
}

.error-state {
  padding: 16px;
}

.range-limit-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fffbe6;
  border-bottom: 1px solid #ffe58f;
  color: #ad8b00;
  font-size: 13px;
}

.range-limit-notice :deep(.anticon) {
  color: #faad14;
}

.preview-content {
  flex: 1;
  overflow: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.chart-section {
  flex: 1;
  min-height: 0;
}

.triggers-section {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.triggers-list :deep(.ant-collapse-header) {
  padding: 12px !important;
  background: white;
  border-radius: 6px !important;
}

.trigger-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.trigger-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.trigger-rule-name {
  font-weight: 500;
}

.trigger-list {
  padding: 8px 0;
}

.trigger-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
}

.trigger-item:last-child {
  border-bottom: none;
}

.trigger-date {
  color: #666;
  min-width: 100px;
}

.trigger-price {
  color: #333;
  font-weight: 500;
  min-width: 100px;
}

.trigger-action {
  color: #1890ff;
  flex: 1;
}

.trigger-more {
  padding: 8px 0;
  color: #999;
  font-size: 12px;
  text-align: center;
}
</style>
