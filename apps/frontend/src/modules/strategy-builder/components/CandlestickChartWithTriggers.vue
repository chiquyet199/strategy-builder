<template>
  <TradingChart
    :data="chartData"
    :markers="chartMarkers"
    :height="height"
    :show-volume="showVolume"
    :show-timeframe-selector="showTimeframeSelector"
    :timeframe="timeframe"
    :timeframes="availableTimeframes"
    :theme="theme"
    :watermark="watermark"
    :loading="loading"
    @timeframe-change="handleTimeframeChange"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import TradingChart from '@/shared/components/charts/TradingChart.vue'
import type { CandleData, ChartMarker, ChartTheme, Timeframe } from '@/shared/types/chart'
import type { TriggerPoint } from '../api/strategyBuilderApi'

interface Candle {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Props {
  /** Candlestick data from API */
  candles: Candle[]
  /** Strategy trigger points to display as markers */
  triggerPoints?: TriggerPoint[]
  /** Chart height in pixels */
  height?: number
  /** Show volume histogram */
  showVolume?: boolean
  /** Show timeframe selector */
  showTimeframeSelector?: boolean
  /** Currently selected timeframe */
  timeframe?: Timeframe
  /** Available timeframes */
  timeframes?: Timeframe[]
  /** Chart theme */
  theme?: ChartTheme
  /** Watermark text (e.g., asset symbol) */
  watermark?: string
  /** Loading state */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  triggerPoints: () => [],
  height: 400,
  showVolume: true,
  showTimeframeSelector: false,
  timeframe: '1D',
  timeframes: () => ['1h', '4h', '1D', '1W'] as Timeframe[],
  theme: 'light',
  watermark: '',
  loading: false,
})

interface Emits {
  (e: 'timeframe-change', timeframe: Timeframe): void
}

const emit = defineEmits<Emits>()

const availableTimeframes = computed(() => props.timeframes)

/**
 * Convert candles to chart format
 * Uses Unix timestamps (seconds) to support all timeframes including intraday
 */
const chartData = computed<CandleData[]>(() => {
  // Sort by timestamp ascending and deduplicate
  const sortedCandles = [...props.candles]
    .sort((a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix())
  
  // Use a Map to deduplicate by timestamp
  const uniqueCandles = new Map<number, CandleData>()
  
  for (const candle of sortedCandles) {
    const unixTime = dayjs(candle.timestamp).unix()
    // Keep the last occurrence if there are duplicates
    uniqueCandles.set(unixTime, {
      time: unixTime,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    })
  }
  
  return Array.from(uniqueCandles.values())
})

/**
 * Convert trigger points to chart markers (Binance style)
 * - Buy actions → small green triangle (▲) below bar
 * - Sell actions → small red triangle (▼) above bar
 * - Other triggers → small orange circle
 * - No text labels (details shown in tooltip)
 */
const chartMarkers = computed<ChartMarker[]>(() => {
  if (!props.triggerPoints || props.triggerPoints.length === 0) {
    return []
  }

  // Sort markers by time and deduplicate by timestamp
  const sortedTriggers = [...props.triggerPoints]
    .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix())

  // Group triggers by timestamp to avoid overlapping markers
  const triggersByTime = new Map<number, TriggerPoint[]>()
  for (const trigger of sortedTriggers) {
    const time = dayjs(trigger.date).unix()
    if (!triggersByTime.has(time)) {
      triggersByTime.set(time, [])
    }
    triggersByTime.get(time)!.push(trigger)
  }

  const markers: ChartMarker[] = []

  // Create one marker per timestamp (combine if multiple triggers)
  for (const [time, triggers] of triggersByTime) {
    // Check if any trigger is a buy or sell
    const hasBuy = triggers.some((t) =>
      t.actionsExecuted.some((action) => action.toLowerCase().includes('buy'))
    )
    const hasSell = triggers.some((t) =>
      t.actionsExecuted.some((action) =>
        action.toLowerCase().includes('sell') ||
        action.toLowerCase().includes('take_profit')
      )
    )

    // If both buy and sell on same candle, show both markers
    if (hasBuy) {
      markers.push({
        time,
        position: 'belowBar',
        color: '#26a69a', // Binance green
        shape: 'arrowUp',
        size: 0.5, // Small size like Binance
      })
    }

    if (hasSell) {
      markers.push({
        time,
        position: 'aboveBar',
        color: '#ef5350', // Binance red
        shape: 'arrowDown',
        size: 0.5, // Small size like Binance
      })
    }

    // If neither buy nor sell, show neutral marker
    if (!hasBuy && !hasSell) {
      markers.push({
        time,
        position: 'belowBar',
        color: '#faad14', // Orange for other triggers
        shape: 'circle',
        size: 0.5,
      })
    }
  }

  return markers
})

function handleTimeframeChange(timeframe: Timeframe) {
  emit('timeframe-change', timeframe)
}
</script>
