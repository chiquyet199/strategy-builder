<template>
  <div class="results-view">
    <a-card>
      <template #title>
        <div class="results-header">
          <h1>Strategy Comparison Results</h1>
          <a-space>
            <a-button @click="goBack">Back to Selection</a-button>
            <a-button @click="downloadChart" :disabled="!backtestStore.hasResults">
              Download Chart
            </a-button>
          </a-space>
        </div>
      </template>

      <div v-if="backtestStore.isLoading" class="loading-container">
        <a-spin size="large" tip="Calculating strategies...">
          <div style="height: 400px"></div>
        </a-spin>
      </div>

      <div v-else-if="backtestStore.error" class="error-container">
        <a-alert
          :message="backtestStore.error"
          type="error"
          show-icon
          closable
          @close="backtestStore.error = null"
        />
        <a-button type="primary" @click="goBack" style="margin-top: 16px">Go Back</a-button>
      </div>

      <div v-else-if="backtestStore.hasResults" class="results-content">
        <!-- Metadata -->
        <a-descriptions v-if="metadata" :column="2" bordered style="margin-bottom: 24px">
          <a-descriptions-item label="Investment Amount">
            ${{ metadata.investmentAmount?.toLocaleString() || 'N/A' }}
          </a-descriptions-item>
          <a-descriptions-item label="Date Range">
            {{ formatDate(metadata.startDate) }} -
            {{ formatDate(metadata.endDate) }}
          </a-descriptions-item>
          <a-descriptions-item label="Timeframe">
            {{ metadata.timeframe?.toUpperCase() || 'N/A' }}
          </a-descriptions-item>
          <a-descriptions-item label="Calculated At">
            {{ formatDateTime(metadata.calculatedAt) }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- Chart -->
        <a-card title="Portfolio Value Over Time" style="margin-bottom: 24px">
          <PortfolioChart :results="backtestStore.strategyResults" />
        </a-card>

        <!-- Metrics Table -->
        <a-card title="Strategy Metrics">
          <a-table
            :columns="columns"
            :data-source="tableData"
            :pagination="false"
            :scroll="{ x: 'max-content' }"
            row-key="strategyId"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'totalReturn'">
                <span :class="getReturnClass(record.metrics.totalReturn)">
                  {{ formatPercentage(record.metrics.totalReturn) }}
                </span>
              </template>
              <template v-else-if="column.key === 'finalValue'">
                ${{ formatNumber(record.metrics.finalValue) }}
              </template>
              <template v-else-if="column.key === 'avgBuyPrice'">
                ${{ formatNumber(record.metrics.avgBuyPrice) }}
              </template>
              <template v-else-if="column.key === 'maxDrawdown'">
                <span class="negative-value">
                  {{ formatPercentage(record.metrics.maxDrawdown) }}
                </span>
              </template>
              <template v-else-if="column.key === 'totalInvestment'">
                ${{ formatNumber(record.metrics.totalInvestment) }}
              </template>
              <template v-else-if="column.key === 'totalBTC'">
                {{ formatBTC(record.metrics.totalBTC) }}
              </template>
              <template v-else-if="column.key === 'sharpeRatio'">
                {{ record.metrics.sharpeRatio.toFixed(2) }}
              </template>
            </template>
          </a-table>
        </a-card>
      </div>

      <div v-else class="no-results">
        <a-empty description="No results available. Please run a comparison first.">
          <a-button type="primary" @click="goBack">Go to Strategy Selection</a-button>
        </a-empty>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBacktestStore } from '../stores/backtestStore'
import PortfolioChart from '../components/PortfolioChart.vue'
import dayjs from 'dayjs'
import type { StrategyResult } from '@/shared/types/backtest'

const router = useRouter()
const backtestStore = useBacktestStore()

// Computed properties for safe metadata access
const metadata = computed(() => backtestStore.results?.metadata || null)

const columns = [
  {
    title: 'Strategy',
    dataIndex: 'strategyName',
    key: 'strategyName',
    fixed: 'left' as const,
  },
  {
    title: 'Total Return',
    key: 'totalReturn',
    sorter: (a: StrategyResult, b: StrategyResult) =>
      a.metrics.totalReturn - b.metrics.totalReturn,
  },
  {
    title: 'Final Value',
    key: 'finalValue',
    sorter: (a: StrategyResult, b: StrategyResult) =>
      a.metrics.finalValue - b.metrics.finalValue,
  },
  {
    title: 'Avg Buy Price',
    key: 'avgBuyPrice',
    sorter: (a: StrategyResult, b: StrategyResult) =>
      a.metrics.avgBuyPrice - b.metrics.avgBuyPrice,
  },
  {
    title: 'Max Drawdown',
    key: 'maxDrawdown',
    sorter: (a: StrategyResult, b: StrategyResult) =>
      a.metrics.maxDrawdown - b.metrics.maxDrawdown,
  },
  {
    title: 'Total Investment',
    key: 'totalInvestment',
  },
  {
    title: 'Total BTC',
    key: 'totalBTC',
  },
  {
    title: 'Sharpe Ratio',
    key: 'sharpeRatio',
    sorter: (a: StrategyResult, b: StrategyResult) =>
      a.metrics.sharpeRatio - b.metrics.sharpeRatio,
  },
]

const tableData = computed(() => backtestStore.strategyResults)

function formatDate(dateString?: string): string {
  if (!dateString) return ''
  return dayjs(dateString).format('MMM DD, YYYY')
}

function formatDateTime(dateString?: string): string {
  if (!dateString) return ''
  return dayjs(dateString).format('MMM DD, YYYY HH:mm:ss')
}

function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatBTC(value: number): string {
  return value.toFixed(8)
}

function getReturnClass(returnValue: number): string {
  return returnValue >= 0 ? 'positive-value' : 'negative-value'
}

function goBack() {
  router.push('/backtest')
}

function downloadChart() {
  // TODO: Implement chart download functionality
  // This would require getting the chart canvas and converting to image
  console.log('Download chart functionality to be implemented')
}
</script>

<style scoped>
.results-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.results-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.loading-container,
.error-container,
.no-results {
  text-align: center;
  padding: 48px;
}

.results-content {
  margin-top: 16px;
}

.positive-value {
  color: #52c41a;
  font-weight: 600;
}

.negative-value {
  color: #f5222d;
  font-weight: 600;
}

@media (max-width: 768px) {
  .results-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

