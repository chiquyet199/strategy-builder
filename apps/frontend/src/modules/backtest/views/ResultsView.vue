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

      <!-- Transactions Modal -->
      <a-modal
        v-model:open="transactionsModalVisible"
        :title="selectedStrategyName ? `Transactions - ${selectedStrategyName}` : 'Transactions'"
        :footer="null"
        width="900px"
      >
        <a-table
          v-if="selectedTransactions"
          :columns="transactionColumns"
          :data-source="selectedTransactions"
          :pagination="{ pageSize: 10 }"
          row-key="date"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'date'">
              {{ formatDateTime(record.date) }}
            </template>
            <template v-else-if="column.key === 'price'">
              ${{ formatNumber(record.price) }}
            </template>
            <template v-else-if="column.key === 'amount'">
              ${{ formatNumber(record.amount) }}
            </template>
            <template v-else-if="column.key === 'quantityPurchased'">
              {{ formatQuantity(record.quantityPurchased) }}
            </template>
            <template v-else-if="column.key === 'reason'">
              <a-tag v-if="record.reason" color="blue">{{ record.reason }}</a-tag>
              <span v-else class="text-gray-400">-</span>
            </template>
          </template>
        </a-table>
      </a-modal>

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
                <span :class="getReturnClass(record.metrics?.totalReturn)">
                  {{ formatPercentage(record.metrics?.totalReturn) }}
                </span>
              </template>
              <template v-else-if="column.key === 'finalValue'">
                ${{ formatNumber(record.metrics?.finalValue) }}
              </template>
              <template v-else-if="column.key === 'avgBuyPrice'">
                ${{ formatNumber(record.metrics?.avgBuyPrice) }}
              </template>
              <template v-else-if="column.key === 'maxDrawdown'">
                <span class="negative-value">
                  {{ formatPercentage(record.metrics?.maxDrawdown) }}
                </span>
              </template>
              <template v-else-if="column.key === 'totalInvestment'">
                ${{ formatNumber(record.metrics?.totalInvestment) }}
              </template>
              <template v-else-if="column.key === 'totalQuantity'">
                {{ formatQuantity(record.metrics?.totalQuantity) }}
              </template>
              <template v-else-if="column.key === 'sharpeRatio'">
                {{ formatSharpeRatio(record.metrics?.sharpeRatio) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-button
                  type="link"
                  size="small"
                  @click="showTransactions(record)"
                  :disabled="!record.transactions || record.transactions.length === 0"
                >
                  View Transactions ({{ record.transactions?.length || 0 }})
                </a-button>
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBacktestStore } from '../stores/backtestStore'
import PortfolioChart from '../components/PortfolioChart.vue'
import dayjs from 'dayjs'
import type { StrategyResult, Transaction } from '@/shared/types/backtest'

const router = useRouter()
const backtestStore = useBacktestStore()

// Computed properties for safe metadata access
const metadata = computed(() => backtestStore.results?.metadata || null)

// Transactions modal state
const transactionsModalVisible = ref(false)
const selectedTransactions = ref<Transaction[] | null>(null)
const selectedStrategyName = ref<string>('')

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
    sorter: (a: StrategyResult, b: StrategyResult) => {
      const aVal = a.metrics?.totalReturn ?? 0
      const bVal = b.metrics?.totalReturn ?? 0
      return aVal - bVal
    },
  },
  {
    title: 'Final Value',
    key: 'finalValue',
    sorter: (a: StrategyResult, b: StrategyResult) => {
      const aVal = a.metrics?.finalValue ?? 0
      const bVal = b.metrics?.finalValue ?? 0
      return aVal - bVal
    },
  },
  {
    title: 'Avg Buy Price',
    key: 'avgBuyPrice',
    sorter: (a: StrategyResult, b: StrategyResult) => {
      const aVal = a.metrics?.avgBuyPrice ?? 0
      const bVal = b.metrics?.avgBuyPrice ?? 0
      return aVal - bVal
    },
  },
  {
    title: 'Max Drawdown',
    key: 'maxDrawdown',
    sorter: (a: StrategyResult, b: StrategyResult) => {
      const aVal = a.metrics?.maxDrawdown ?? 0
      const bVal = b.metrics?.maxDrawdown ?? 0
      return aVal - bVal
    },
  },
  {
    title: 'Total Investment',
    key: 'totalInvestment',
  },
  {
    title: 'Total Quantity',
    key: 'totalQuantity',
  },
  {
    title: 'Sharpe Ratio',
    key: 'sharpeRatio',
    sorter: (a: StrategyResult, b: StrategyResult) => {
      const aVal = a.metrics?.sharpeRatio ?? 0
      const bVal = b.metrics?.sharpeRatio ?? 0
      return aVal - bVal
    },
  },
  {
    title: 'Actions',
    key: 'actions',
    fixed: 'right' as const,
    width: 120,
  },
]

const transactionColumns = [
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
    sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  },
  {
    title: 'Price',
    key: 'price',
    sorter: (a: any, b: any) => a.price - b.price,
  },
  {
    title: 'Amount (USD)',
    key: 'amount',
    sorter: (a: any, b: any) => a.amount - b.amount,
  },
  {
    title: 'Quantity Purchased',
    key: 'quantityPurchased',
    sorter: (a: any, b: any) => a.quantityPurchased - b.quantityPurchased,
  },
  {
    title: 'Reason',
    key: 'reason',
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

function formatPercentage(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatQuantity(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  return value.toFixed(8)
}

function formatSharpeRatio(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  return value.toFixed(2)
}

function getReturnClass(returnValue: number | null | undefined): string {
  if (returnValue == null || isNaN(returnValue)) return ''
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

function showTransactions(strategy: StrategyResult) {
  selectedTransactions.value = strategy.transactions || []
  selectedStrategyName.value = strategy.strategyName
  transactionsModalVisible.value = true
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

