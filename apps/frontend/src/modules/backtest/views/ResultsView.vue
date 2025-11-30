<template>
  <div class="results-view">
    <a-card>
      <template #title>
        <div class="results-header">
          <h1>{{ t('backtest.results.metadata.title') }}</h1>
          <a-space>
            <a-button @click="goBack">{{ t('backtest.results.metadata.backToSelection') }}</a-button>
            <a-button @click="downloadChart" :disabled="!backtestStore.hasResults">
              {{ t('backtest.results.metadata.downloadChart') }}
            </a-button>
          </a-space>
        </div>
      </template>

      <!-- Transactions Modal -->
      <a-modal
        v-model:open="transactionsModalVisible"
        :title="selectedStrategyName ? t('backtest.results.transactions.modalTitle', { strategy: selectedStrategyName }) : t('backtest.results.transactions.title')"
        :footer="null"
        width="95%"
        :style="{ maxWidth: '1400px' }"
      >
        <a-table
          v-if="selectedTransactions"
          :columns="transactionColumns"
          :data-source="selectedTransactions"
          :pagination="{ pageSize: 10 }"
          :scroll="{ x: 'max-content', y: '60vh' }"
          row-key="date"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'date'">
              {{ formatDate(record.date) }}
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
            <template v-else-if="column.key === 'coinValue'">
              ${{ formatNumber(record.portfolioValue?.coinValue) }}
            </template>
            <template v-else-if="column.key === 'usdcValue'">
              ${{ formatNumber(record.portfolioValue?.usdcValue) }}
            </template>
            <template v-else-if="column.key === 'totalValue'">
              <strong>${{ formatNumber(record.portfolioValue?.totalValue) }}</strong>
            </template>
            <template v-else-if="column.key === 'reason'">
              <a-tag v-if="record.reason" color="blue">{{ record.reason }}</a-tag>
              <span v-else class="text-gray-400">-</span>
            </template>
          </template>
        </a-table>
      </a-modal>

      <div v-if="backtestStore.isLoading" class="loading-container">
        <a-spin size="large" :tip="t('backtest.results.metadata.calculating')">
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
        <a-button type="primary" @click="goBack" style="margin-top: 16px">{{ t('backtest.results.metadata.backToSelection') }}</a-button>
      </div>

      <div v-else-if="backtestStore.hasResults" class="results-content">
        <!-- Metadata -->
        <a-descriptions v-if="metadata" :column="2" bordered style="margin-bottom: 24px">
          <a-descriptions-item :label="t('backtest.results.metadata.investmentAmount')">
            ${{ metadata.investmentAmount?.toLocaleString() || 'N/A' }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('backtest.results.metadata.dateRange')">
            {{ formatDate(metadata.startDate) }} -
            {{ formatDate(metadata.endDate) }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('backtest.results.metadata.timeframe')">
            {{ metadata.timeframe?.toUpperCase() || 'N/A' }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('backtest.results.metadata.calculatedAt')">
            {{ formatDateTime(metadata.calculatedAt) }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- Chart -->
        <a-card :title="t('backtest.results.metadata.portfolioValue')" style="margin-bottom: 24px">
          <PortfolioChart :results="backtestStore.strategyResults" />
        </a-card>

        <!-- Metrics Table -->
        <a-card :title="t('backtest.results.metadata.metrics')">
          <a-table
            :columns="columns"
            :data-source="tableData"
            :pagination="false"
            :scroll="{ x: 'max-content' }"
            row-key="strategyId"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'strategy'">
                {{ record.variantName || record.strategyName }}
              </template>
              <template v-else-if="column.key === 'totalReturn'">
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
                  {{ t('backtest.results.metrics.viewTransactions', { count: record.transactions?.length || 0 }) }}
                </a-button>
              </template>
            </template>
          </a-table>
        </a-card>
      </div>

      <div v-else class="no-results">
        <a-empty :description="t('backtest.results.metadata.noResults')">
          <a-button type="primary" @click="goBack">{{ t('backtest.results.metadata.goToSelection') }}</a-button>
        </a-empty>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBacktestStore } from '../stores/backtestStore'
import PortfolioChart from '../components/PortfolioChart.vue'
import dayjs from 'dayjs'
import type { StrategyResult, Transaction } from '@/shared/types/backtest'

const router = useRouter()
const backtestStore = useBacktestStore()
const { t } = useI18n()

// Computed properties for safe metadata access
const metadata = computed(() => backtestStore.results?.metadata || null)

// Get coin symbol from metadata (default to BTC for MVP)
// TODO: Extract from symbol in metadata when multiple coins are supported
const coinSymbol = computed(() => {
  // For MVP, we only support BTC/USD, but this is extensible
  // In the future, extract from metadata.symbol (e.g., 'BTC/USD' -> 'BTC')
  return 'BTC'
})

// Transactions modal state
const transactionsModalVisible = ref(false)
const selectedTransactions = ref<Transaction[] | null>(null)
const selectedStrategyName = ref<string>('')

const columns = computed(() => [
  {
    title: t('backtest.results.metrics.strategy'),
    key: 'strategy',
    fixed: 'left' as const,
  },
  {
    title: t('backtest.results.metrics.totalReturn'),
    key: 'totalReturn',
    sorter: (a: StrategyResult, b: StrategyResult) => {
      const aVal = a.metrics?.totalReturn ?? 0
      const bVal = b.metrics?.totalReturn ?? 0
      return aVal - bVal
    },
  },
  {
    title: t('backtest.results.metrics.finalValue'),
    key: 'finalValue',
    sorter: (a: StrategyResult, b: StrategyResult) => {
      const aVal = a.metrics?.finalValue ?? 0
      const bVal = b.metrics?.finalValue ?? 0
      return aVal - bVal
    },
  },
  {
    title: t('backtest.results.metrics.avgBuyPrice'),
    key: 'avgBuyPrice',
    sorter: (a: StrategyResult, b: StrategyResult) => {
      const aVal = a.metrics?.avgBuyPrice ?? 0
      const bVal = b.metrics?.avgBuyPrice ?? 0
      return aVal - bVal
    },
  },
  {
    title: t('backtest.results.metrics.maxDrawdown'),
    key: 'maxDrawdown',
    sorter: (a: StrategyResult, b: StrategyResult) => {
      const aVal = a.metrics?.maxDrawdown ?? 0
      const bVal = b.metrics?.maxDrawdown ?? 0
      return aVal - bVal
    },
  },
  {
    title: t('backtest.results.metrics.totalInvestment'),
    key: 'totalInvestment',
  },
  {
    title: t('backtest.results.metrics.totalQuantity'),
    key: 'totalQuantity',
  },
  {
    title: t('backtest.results.metrics.sharpeRatio'),
    key: 'sharpeRatio',
    sorter: (a: StrategyResult, b: StrategyResult) => {
      const aVal = a.metrics?.sharpeRatio ?? 0
      const bVal = b.metrics?.sharpeRatio ?? 0
      return aVal - bVal
    },
  },
  {
    title: t('backtest.results.metrics.actions'),
    key: 'actions',
    fixed: 'right' as const,
    width: 120,
  },
])

const transactionColumns = computed(() => [
  {
    title: t('backtest.results.transactions.date'),
    dataIndex: 'date',
    key: 'date',
    sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  },
  {
    title: t('backtest.results.transactions.price'),
    key: 'price',
    sorter: (a: any, b: any) => a.price - b.price,
  },
  {
    title: t('backtest.results.transactions.amount'),
    key: 'amount',
    sorter: (a: any, b: any) => a.amount - b.amount,
  },
  {
    title: t('backtest.results.transactions.quantityPurchased'),
    key: 'quantityPurchased',
    sorter: (a: any, b: any) => a.quantityPurchased - b.quantityPurchased,
  },
  {
    title: t('backtest.results.transactions.remainingCoin', { coinSymbol: coinSymbol.value }),
    key: 'coinValue',
    sorter: (a: any, b: any) => (a.portfolioValue?.coinValue || 0) - (b.portfolioValue?.coinValue || 0),
  },
  {
    title: t('backtest.results.transactions.remainingUsdc'),
    key: 'usdcValue',
    sorter: (a: any, b: any) => (a.portfolioValue?.usdcValue || 0) - (b.portfolioValue?.usdcValue || 0),
  },
  {
    title: t('backtest.results.transactions.totalPortfolioValue'),
    key: 'totalValue',
    sorter: (a: any, b: any) => (a.portfolioValue?.totalValue || 0) - (b.portfolioValue?.totalValue || 0),
  },
  {
    title: t('backtest.results.transactions.reason'),
    key: 'reason',
  },
])

const tableData = computed(() => backtestStore.strategyResults)

function formatDate(dateString?: string): string {
  if (!dateString) return ''
  return dayjs(dateString).format('DD-MM-YYYY')
}

function formatDateTime(dateString?: string): string {
  if (!dateString) return ''
  return dayjs(dateString).format('DD-MM-YYYY HH:mm:ss')
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
}

function showTransactions(strategy: StrategyResult) {
  selectedTransactions.value = strategy.transactions || []
  selectedStrategyName.value = strategy.variantName || strategy.strategyName
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

