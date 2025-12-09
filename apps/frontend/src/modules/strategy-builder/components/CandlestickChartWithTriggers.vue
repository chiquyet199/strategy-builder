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
  /** Rule colors map (ruleId -> color) for color-coded markers */
  ruleColors?: Map<string, string>
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
  ruleColors: () => new Map(),
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
 * Convert trigger points to chart markers (Binance style with rule colors)
 * - Buy actions → small colored triangle (▲) below bar
 * - Sell actions → small colored triangle (▼) above bar
 * - Color based on rule (if ruleColors provided) or action type
 */
const chartMarkers = computed<ChartMarker[]>(() => {
  if (!props.triggerPoints || props.triggerPoints.length === 0) {
    return []
  }

  // Sort markers by time
  const sortedTriggers = [...props.triggerPoints]
    .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix())

  // Group triggers by timestamp to handle multiple triggers on same candle
  const triggersByTime = new Map<number, TriggerPoint[]>()
  for (const trigger of sortedTriggers) {
    const time = dayjs(trigger.date).unix()
    if (!triggersByTime.has(time)) {
      triggersByTime.set(time, [])
    }
    triggersByTime.get(time)!.push(trigger)
  }

  const markers: ChartMarker[] = []

  // Create markers for each timestamp
  for (const [time, triggers] of triggersByTime) {
    // Group by action type (buy/sell) and rule
    const buyTriggers = triggers.filter((t) =>
      t.actionsExecuted.some((action) => action.toLowerCase().includes('buy'))
    )
    const sellTriggers = triggers.filter((t) =>
      t.actionsExecuted.some((action) =>
        action.toLowerCase().includes('sell') ||
        action.toLowerCase().includes('take_profit')
      )
    )

    // Create buy markers
    for (const trigger of buyTriggers) {
      const color = props.ruleColors.get(trigger.ruleId) || '#26a69a'
      markers.push({
        time,
        position: 'belowBar',
        color,
        shape: 'arrowUp',
        size: 0.5,
      })
    }

    // Create sell markers
    for (const trigger of sellTriggers) {
      const color = props.ruleColors.get(trigger.ruleId) || '#ef5350'
      markers.push({
        time,
        position: 'aboveBar',
        color,
        shape: 'arrowDown',
        size: 0.5,
      })
    }

    // Create neutral markers for triggers that are neither buy nor sell
    const otherTriggers = triggers.filter(
      (t) => !buyTriggers.includes(t) && !sellTriggers.includes(t)
    )
    for (const trigger of otherTriggers) {
      const color = props.ruleColors.get(trigger.ruleId) || '#faad14'
      markers.push({
        time,
        position: 'belowBar',
        color,
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
