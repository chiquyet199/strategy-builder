<template>
  <div class="candlestick-chart-container">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js'
import dayjs from 'dayjs'
import type { TriggerPoint } from '../api/strategyBuilderApi'

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
)

interface Props {
  candles: Array<{
    timestamp: string
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
  triggerPoints: TriggerPoint[]
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

// Create a map of trigger points by date for quick lookup
const triggersByDate = computed(() => {
  const map = new Map<string, TriggerPoint[]>()
  props.triggerPoints.forEach((trigger) => {
    const date = dayjs(trigger.date).format('YYYY-MM-DD')
    if (!map.has(date)) {
      map.set(date, [])
    }
    map.get(date)!.push(trigger)
  })
  return map
})

function createChart() {
  if (!chartCanvas.value || props.candles.length === 0) {
    return
  }

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
  }

  // Prepare candlestick data (simplified as line chart with OHLC markers)
  const labels = props.candles.map((c) => dayjs(c.timestamp).format('MMM DD, YYYY'))
  const closePrices = props.candles.map((c) => c.close)
  const highPrices = props.candles.map((c) => c.high)
  const lowPrices = props.candles.map((c) => c.low)

  // Prepare trigger points data
  const triggerPrices: (number | null)[] = []
  const triggerLabels: string[] = []

  props.candles.forEach((candle) => {
    const date = dayjs(candle.timestamp).format('YYYY-MM-DD')
    const triggers = triggersByDate.value.get(date)
    if (triggers && triggers.length > 0) {
      // Use the first trigger's price (or average if multiple)
      const avgPrice =
        triggers.reduce((sum: number, t: TriggerPoint) => sum + t.price, 0) / triggers.length
      triggerPrices.push(avgPrice)
      triggerLabels.push(`${triggers.length} trigger${triggers.length > 1 ? 's' : ''}`)
    } else {
      triggerPrices.push(null)
      triggerLabels.push('')
    }
  })

  const datasets: any[] = [
    {
      label: 'Close Price',
      data: closePrices,
      borderColor: '#1890ff',
      backgroundColor: '#1890ff20',
      borderWidth: 1,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.1,
    },
    {
      label: 'High',
      data: highPrices,
      borderColor: '#52c41a',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [5, 5],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0.1,
    },
    {
      label: 'Low',
      data: lowPrices,
      borderColor: '#f5222d',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [5, 5],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0.1,
    },
    {
      label: 'Trigger Points',
      data: triggerPrices,
      borderColor: '#faad14',
      backgroundColor: '#faad14',
      pointRadius: 6,
      pointHoverRadius: 8,
      pointStyle: 'circle',
      showLine: false,
      pointBackgroundColor: '#faad14',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    },
  ]

  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (context) => {
              return context[0].label
            },
            label: (context) => {
              const datasetLabel = context.dataset.label || ''
              const value = context.parsed.y

              if (
                datasetLabel === 'Trigger Points' &&
                value !== null &&
                typeof value === 'number'
              ) {
                const index = context.dataIndex
                if (index !== undefined && props.candles[index]) {
                  const date = dayjs(props.candles[index].timestamp).format('YYYY-MM-DD')
                  const triggers = triggersByDate.value.get(date) || []
                  if (triggers.length > 0) {
                    return [
                      `Trigger Point: $${value.toLocaleString()}`,
                      `${triggers.length} trigger${triggers.length > 1 ? 's' : ''}`,
                      ...triggers.map((t: TriggerPoint) => `  • ${t.conditionMet}`),
                    ]
                  }
                }
              }

              if (value !== null && typeof value === 'number') {
                return `${datasetLabel}: $${value.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              }
              return `${datasetLabel}: N/A`
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Date',
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            maxTicksLimit: 20,
            autoSkip: true,
            autoSkipPadding: 10,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Price (USD)',
          },
          ticks: {
            callback: (value) => {
              return `$${Number(value).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`
            },
          },
        },
      },
    },
  }

  chartInstance = new Chart(chartCanvas.value, config)
}

onMounted(() => {
  createChart()
})

watch(
  () => [props.candles, props.triggerPoints],
  () => {
    createChart()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>

<style scoped>
.candlestick-chart-container {
  position: relative;
  height: 400px;
  width: 100%;
}
</style>
