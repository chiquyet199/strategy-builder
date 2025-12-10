<template>
  <div class="trading-chart-wrapper">
    <!-- Timeframe selector -->
    <div v-if="showTimeframeSelector" class="chart-toolbar">
      <a-radio-group
        v-model:value="selectedTimeframe"
        size="small"
        button-style="solid"
        @change="handleTimeframeChange"
      >
        <a-radio-button
          v-for="tf in availableTimeframes"
          :key="tf.value"
          :value="tf.value"
        >
          {{ tf.label }}
        </a-radio-button>
      </a-radio-group>

      <div class="chart-actions">
        <a-tooltip title="Fit to data">
          <a-button size="small" @click="handleFitContent">
            <template #icon>
              <FullscreenOutlined />
            </template>
          </a-button>
        </a-tooltip>
        <a-tooltip :title="currentTheme === 'dark' ? 'Light mode' : 'Dark mode'">
          <a-button size="small" @click="toggleTheme">
            <template #icon>
              <BulbOutlined v-if="currentTheme === 'dark'" />
              <BulbFilled v-else />
            </template>
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <!-- Chart container -->
    <div
      ref="chartContainerRef"
      class="chart-container"
      :style="{ height: `${height}px` }"
    />

    <!-- Loading overlay -->
    <div v-if="loading" class="chart-loading">
      <a-spin size="large" />
    </div>

    <!-- Empty state -->
    <div v-if="!loading && (!data || data.length === 0)" class="chart-empty">
      <a-empty description="No data available" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Spin as ASpin, Empty as AEmpty, Button as AButton, RadioGroup as ARadioGroup, RadioButton as ARadioButton, Tooltip as ATooltip } from 'ant-design-vue'
import { FullscreenOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons-vue'
import { useTradingChart } from '@/shared/composables/useTradingChart'
import type { CandleData, ChartMarker, ChartTheme, Timeframe } from '@/shared/types/chart'

interface Props {
  /** Candlestick data */
  data: CandleData[]
  /** Chart markers (buy/sell signals, triggers) */
  markers?: ChartMarker[]
  /** Chart height in pixels */
  height?: number
  /** Show volume histogram */
  showVolume?: boolean
  /** Show timeframe selector */
  showTimeframeSelector?: boolean
  /** Currently selected timeframe */
  timeframe?: Timeframe
  /** Available timeframes to show in selector */
  timeframes?: Timeframe[]
  /** Initial theme */
  theme?: ChartTheme
  /** Watermark text */
  watermark?: string
  /** Loading state */
  loading?: boolean
  /** Default number of days to show initially (for zoom level) */
  defaultVisibleDays?: number
}

const props = withDefaults(defineProps<Props>(), {
  markers: () => [],
  height: 400,
  showVolume: true,
  showTimeframeSelector: true,
  timeframe: '1D',
  timeframes: () => ['1h', '4h', '1D', '1W', '1M'] as Timeframe[],
  theme: 'light',
  watermark: '',
  loading: false,
  defaultVisibleDays: undefined,
})

interface Emits {
  (e: 'timeframe-change', timeframe: Timeframe): void
  (e: 'range-change', range: { from: string; to: string }): void
}

const emit = defineEmits<Emits>()

// Timeframe labels
const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1H',
  '4h': '4H',
  '1D': '1D',
  '1W': '1W',
  '1M': '1M',
}

const selectedTimeframe = ref<Timeframe>(props.timeframe)
const currentTheme = ref<ChartTheme>(props.theme)

const availableTimeframes = computed(() =>
  props.timeframes.map((tf) => ({
    value: tf,
    label: TIMEFRAME_LABELS[tf],
  }))
)

// Initialize chart
const {
  chartContainerRef,
  chart,
  setData,
  setMarkers,
  fitContent,
  setTheme,
  resize,
  setVisibleRange,
} = useTradingChart({
  height: props.height,
  showVolume: props.showVolume,
  theme: props.theme,
  watermark: props.watermark,
})

/**
 * Apply default visible range based on defaultVisibleDays prop
 * Shows the most recent data (zooms to the end)
 */
function applyDefaultVisibleRange(data: CandleData[]) {
  if (!props.defaultVisibleDays || data.length === 0) {
    return // Let fitContent handle it
  }

  // Find the time range of the data
  const sortedData = [...data].sort((a, b) => (a.time as number) - (b.time as number))
  const lastCandle = sortedData[sortedData.length - 1]
  const lastTime = lastCandle.time as number

  // Calculate visible range (show last N days)
  const secondsPerDay = 24 * 60 * 60
  const visibleSeconds = props.defaultVisibleDays * secondsPerDay
  const fromTime = lastTime - visibleSeconds

  // Set the visible range
  setVisibleRange(fromTime, lastTime)
}

// Watch for data changes
watch(
  () => props.data,
  (newData) => {
    if (newData && newData.length > 0) {
      setData(newData)
      // Apply default zoom after data is set
      setTimeout(() => {
        applyDefaultVisibleRange(newData)
      }, 50)
    }
  },
  { deep: true }
)

// Watch for markers changes
watch(
  () => props.markers,
  (newMarkers) => {
    if (newMarkers) {
      setMarkers(newMarkers)
    }
  },
  { deep: true }
)

// Watch for theme prop changes
watch(
  () => props.theme,
  (newTheme) => {
    currentTheme.value = newTheme
    setTheme(newTheme)
  }
)

// Watch for timeframe prop changes (sync from parent)
watch(
  () => props.timeframe,
  (newTimeframe) => {
    if (newTimeframe !== selectedTimeframe.value) {
      selectedTimeframe.value = newTimeframe
    }
  }
)

// Watch for height prop changes and resize chart
watch(
  () => props.height,
  (newHeight) => {
    if (newHeight && newHeight > 0) {
      resize(undefined, newHeight)
    }
  }
)

// Set initial data when chart is ready
watch(chart, (chartInstance) => {
  if (chartInstance && props.data.length > 0) {
    setData(props.data)
    if (props.markers && props.markers.length > 0) {
      setMarkers(props.markers)
    }
    // Apply default zoom after initial render
    setTimeout(() => {
      applyDefaultVisibleRange(props.data)
    }, 50)
  }
})

function handleTimeframeChange() {
  emit('timeframe-change', selectedTimeframe.value)
}

function handleFitContent() {
  fitContent()
}

function toggleTheme() {
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
  setTheme(currentTheme.value)
}

// Expose methods for parent components
defineExpose({
  fitContent,
  setTheme,
  setData,
  setMarkers,
})
</script>

<style scoped>
.trading-chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--chart-bg, #ffffff);
  border-radius: 8px;
  overflow: hidden;
}

.chart-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: inherit;
}

.chart-actions {
  display: flex;
  gap: 8px;
}

.chart-container {
  width: 100%;
}

.chart-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
}

.chart-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
}

/* Dark theme adjustments */
:deep(.ant-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

:deep(.ant-radio-button-wrapper) {
  border-radius: 4px !important;
  border-left-width: 1px !important;
}

:deep(.ant-radio-button-wrapper:first-child) {
  border-radius: 4px !important;
}

:deep(.ant-radio-button-wrapper:last-child) {
  border-radius: 4px !important;
}
</style>
