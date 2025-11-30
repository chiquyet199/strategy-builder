<template>
  <div class="portfolio-chart">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js'
import dayjs from 'dayjs'
import type { StrategyResult } from '@/shared/types/backtest'

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
)

interface Props {
  results: StrategyResult[]
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const colors = [
  '#1890ff', // Blue
  '#52c41a', // Green
  '#faad14', // Orange
  '#f5222d', // Red
  '#722ed1', // Purple
  '#13c2c2', // Cyan
  '#eb2f96', // Pink
]

function createChart() {
  if (!chartCanvas.value || props.results.length === 0) {
    return
  }

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
  }

  // Prepare data - format dates for x-axis
  const datasets = props.results.map((result, index) => {
    const data = result.portfolioValueHistory.map((point) => ({
      x: dayjs(point.date).format('DD-MM-YYYY'),
      y: point.value,
    }))

    return {
      label: result.variantName || result.strategyName,
      data,
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + '20',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.1,
    }
  })

  // Get all unique dates and format them
  const allDates = new Set<string>()
  props.results.forEach((result) => {
    result.portfolioValueHistory.forEach((point) => {
      allDates.add(point.date)
    })
  })
  const labels = Array.from(allDates).sort().map((date) => dayjs(date).format('DD-MM-YYYY'))

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
          display: true,
          text: 'Portfolio Value Over Time',
          font: {
            size: 16,
          },
        },
        tooltip: {
          callbacks: {
            title: (context) => {
              const label = context[0].label
              if (label) {
                // Label is already formatted as DD-MM-YYYY
                return label
              }
              return ''
            },
            label: (context) => {
              const value = context.parsed.y
              return `${context.dataset.label}: $${value.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
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
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Portfolio Value (USD)',
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
  () => props.results,
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
.portfolio-chart {
  width: 100%;
  height: 500px;
  position: relative;
}
</style>

