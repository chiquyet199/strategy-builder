<template>
  <div class="w-full min-h-[calc(100vh-64px)] md:p-0">
    <!-- Transactions Modal -->
    <a-modal
      v-model:open="transactionsModalVisible"
      :title="
        selectedStrategyName
          ? t('backtest.results.transactions.modalTitle', { strategy: selectedStrategyName })
          : t('backtest.results.transactions.title')
      "
      :footer="null"
      width="95%"
      :style="{ maxWidth: '1400px' }"
    >
      <!-- Transaction Type Filter -->
      <div class="mb-4 flex items-center gap-2">
        <span class="text-sm font-medium">Filter by type:</span>
        <a-radio-group v-model:value="transactionTypeFilter" @change="handleTransactionTypeFilterChange">
          <a-radio-button value="all">All</a-radio-button>
          <a-radio-button value="buy">Buy</a-radio-button>
          <a-radio-button value="sell">Sell</a-radio-button>
          <a-radio-button value="funding">Funding</a-radio-button>
        </a-radio-group>
        <span class="text-sm text-gray-500 ml-2">
          ({{ filteredTransactions.length }} of {{ allTransactions.length }} transactions)
        </span>
      </div>

      <a-table
        v-if="selectedTransactions"
        :columns="transactionColumns"
        :data-source="filteredTransactions"
        :pagination="{ pageSize: 10 }"
        :scroll="{ x: 'max-content', y: '60vh' }"
        row-key="date"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'date'">
            {{ formatDate(record.date) }}
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag
              :color="
                (record.type || 'buy') === 'buy'
                  ? 'green'
                  : (record.type || 'buy') === 'sell'
                    ? 'red'
                    : 'blue'
              "
            >
              {{
                (record.type || 'buy') === 'buy'
                  ? t('backtest.results.transactions.buy')
                  : (record.type || 'buy') === 'sell'
                    ? t('backtest.results.transactions.sell')
                    : t('backtest.results.transactions.funding')
              }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'price'">
            ${{ formatNumber(record.price) }}
          </template>
          <template v-else-if="column.key === 'amount'">
            ${{ formatNumber(record.amount) }}
          </template>
          <template v-else-if="column.key === 'quantityPurchased'">
            <span v-if="(record.type || 'buy') === 'funding'" style="color: #8c8c8c"> - </span>
            <span
              v-else
              :class="(record.type || 'buy') === 'sell' ? 'negative-value' : 'positive-value'"
            >
              {{ (record.type || 'buy') === 'buy' ? '+' : ''
              }}{{ formatQuantity(record.quantityPurchased) }}
            </span>
          </template>
          <template v-else-if="column.key === 'coinValue'">
            <div>
              <div>
                {{ formatQuantity(record.portfolioValue?.quantityHeld || 0) }} {{ coinSymbol }}
              </div>
              <div style="color: #8c8c8c; font-size: 12px">
                ${{ formatNumber(record.portfolioValue?.coinValue) }}
              </div>
            </div>
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

    <div v-if="backtestStore.isLoading" class="text-center py-12">
      <a-spin size="large" :tip="t('backtest.results.metadata.calculating')">
        <div class="h-[400px]"></div>
      </a-spin>
    </div>

    <div v-else-if="backtestStore.error" class="text-center py-12">
      <a-alert
        :message="backtestStore.error"
        type="error"
        show-icon
        closable
        @close="backtestStore.error = null"
      />
    </div>

    <div v-else-if="backtestStore.hasResults">
      <!-- Header with Share Button -->
      <div
        class="flex flex-col md:flex-row justify-between items-start md:items-center flex-wrap gap-4 mb-6"
      >
        <h2 class="m-0 text-2xl font-semibold">{{ t('backtest.results.metadata.title') }}</h2>
        <a-space>
          <ShareButton v-if="backtestStore.hasResults" />
          <a-button @click="downloadChart" :disabled="!backtestStore.hasResults">
            {{ t('backtest.results.metadata.downloadChart') }}
          </a-button>
        </a-space>
      </div>

      <!-- Chart -->
      <a-card :title="t('backtest.results.metadata.portfolioValue')" class="mt-6">
        <PortfolioChart :results="backtestStore.strategyResults" />
      </a-card>

      <!-- Metrics Table -->
      <div class="mt-4">
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
                <div class="flex items-center gap-2">
                  <span v-if="getWinnerRank(record) === 1" class="text-2xl">🥇</span>
                  <span v-else-if="getWinnerRank(record) === 2" class="text-2xl">🥈</span>
                  <span v-else-if="getWinnerRank(record) === 3" class="text-2xl">🥉</span>
                  <span class="font-medium">
                    {{ getStrategyDisplayName(record) }}
                  </span>
                </div>
              </template>
              <template v-else-if="column.key === 'transactions'">
                <a-button
                  type="link"
                  class="p-0 h-auto font-medium hover:underline"
                  :disabled="!record.transactions || record.transactions.length === 0"
                  @click="showTransactions(record)"
                >
                  {{ record.transactions?.length || 0 }}
                </a-button>
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
                <span class="text-red-500 font-semibold">
                  {{ formatPercentage(record.metrics?.maxDrawdown, true) }}
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
            </template>
          </a-table>
        </a-card>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <a-empty :description="t('backtest.results.metadata.noResults')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, h, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { RadioGroup as ARadioGroup, RadioButton as ARadioButton } from 'ant-design-vue'
import { useBacktestStore } from '../stores/backtestStore'
import PortfolioChart from './PortfolioChart.vue'
import ShareButton from './ShareButton.vue'
import dayjs from 'dayjs'
import type { StrategyResult, Transaction, StrategyConfig } from '@/shared/types/backtest'
import { isSameStrategyConfig } from '../../../shared/utils/strategy-identifier'

const backtestStore = useBacktestStore()
const { t } = useI18n()

// Get coin symbol from metadata (default to BTC for MVP)
const coinSymbol = computed(() => {
  return 'BTC'
})

// Transactions modal state
const transactionsModalVisible = ref(false)
const selectedTransactions = ref<Transaction[] | null>(null)
const selectedStrategyName = ref<string>('')
const transactionTypeFilter = ref<string>('all')

// Computed filtered transactions
const allTransactions = computed(() => selectedTransactions.value || [])
const filteredTransactions = computed(() => {
  if (transactionTypeFilter.value === 'all') {
    return allTransactions.value
  }
  return allTransactions.value.filter((tx) => {
    const txType = tx.type || 'buy'
    return txType === transactionTypeFilter.value
  })
})

const handleTransactionTypeFilterChange = () => {
  // Filter is reactive, no action needed
}

const columns = computed(() => {
  const ATooltip = resolveComponent('a-tooltip')
  return [
    {
      title: () =>
        h('span', [
          t('backtest.results.metrics.strategy'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.metrics.strategyTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'strategy',
      fixed: 'left' as const,
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.metrics.transactions'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.metrics.transactionsTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'transactions',
      width: 120,
      align: 'center' as const,
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.metrics.totalReturn'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.metrics.totalReturnTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'totalReturn',
      defaultSortOrder: 'descend' as const,
      sorter: (a: StrategyResult, b: StrategyResult) => {
        const aVal = a.metrics?.totalReturn ?? 0
        const bVal = b.metrics?.totalReturn ?? 0
        return bVal - aVal // Descending: bigger values first (best strategies on top)
      },
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.metrics.finalValue'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.metrics.finalValueTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'finalValue',
      sorter: (a: StrategyResult, b: StrategyResult) => {
        const aVal = a.metrics?.finalValue ?? 0
        const bVal = b.metrics?.finalValue ?? 0
        return aVal - bVal
      },
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.metrics.avgBuyPrice'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.metrics.avgBuyPriceTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'avgBuyPrice',
      sorter: (a: StrategyResult, b: StrategyResult) => {
        const aVal = a.metrics?.avgBuyPrice ?? 0
        const bVal = b.metrics?.avgBuyPrice ?? 0
        return aVal - bVal
      },
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.metrics.maxDrawdown'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.metrics.maxDrawdownTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'maxDrawdown',
      sorter: (a: StrategyResult, b: StrategyResult) => {
        const aVal = a.metrics?.maxDrawdown ?? 0
        const bVal = b.metrics?.maxDrawdown ?? 0
        return aVal - bVal
      },
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.metrics.totalInvestment'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.metrics.totalInvestmentTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'totalInvestment',
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.metrics.totalQuantity'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.metrics.totalQuantityTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'totalQuantity',
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.metrics.sharpeRatio'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.metrics.sharpeRatioTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'sharpeRatio',
      sorter: (a: StrategyResult, b: StrategyResult) => {
        const aVal = a.metrics?.sharpeRatio ?? 0
        const bVal = b.metrics?.sharpeRatio ?? 0
        return aVal - bVal
      },
    },
  ]
})

const transactionColumns = computed(() => {
  const ATooltip = resolveComponent('a-tooltip')
  return [
    {
      title: () =>
        h('span', [
          t('backtest.results.transactions.date'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.transactions.dateTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      dataIndex: 'date',
      key: 'date',
      sorter: (a: Transaction, b: Transaction) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.transactions.type'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.transactions.typeTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'type',
      width: 100,
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.transactions.price'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.transactions.priceTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'price',
      sorter: (a: Transaction, b: Transaction) => a.price - b.price,
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.transactions.amount'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.transactions.amountTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'amount',
      sorter: (a: Transaction, b: Transaction) => a.amount - b.amount,
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.transactions.quantityPurchased'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.transactions.quantityPurchasedTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'quantityPurchased',
      sorter: (a: Transaction, b: Transaction) => a.quantityPurchased - b.quantityPurchased,
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.transactions.remainingCoin', { coinSymbol: coinSymbol.value }),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.transactions.remainingCoinTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'coinValue',
      sorter: (a: Transaction, b: Transaction) =>
        (a.portfolioValue?.coinValue || 0) - (b.portfolioValue?.coinValue || 0),
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.transactions.remainingUsdc'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.transactions.remainingUsdcTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'usdcValue',
      sorter: (a: Transaction, b: Transaction) =>
        (a.portfolioValue?.usdcValue || 0) - (b.portfolioValue?.usdcValue || 0),
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.transactions.totalPortfolioValue'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.transactions.totalPortfolioValueTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'totalValue',
      sorter: (a: Transaction, b: Transaction) =>
        (a.portfolioValue?.totalValue || 0) - (b.portfolioValue?.totalValue || 0),
    },
    {
      title: () =>
        h('span', [
          t('backtest.results.transactions.reason'),
          ' ',
          h(
            ATooltip,
            { title: t('backtest.results.transactions.reasonTooltip') },
            {
              default: () =>
                h(QuestionCircleOutlined, {
                  style: 'margin-left: 4px; color: #8c8c8c; cursor: help;',
                }),
            },
          ),
        ]),
      key: 'reason',
    },
  ]
})

const tableData = computed(() => {
  const results = [...(backtestStore.strategyResults || [])]
  // Sort by total return descending (best strategies first)
  return results.sort((a, b) => {
    const aVal = a.metrics?.totalReturn ?? 0
    const bVal = b.metrics?.totalReturn ?? 0
    return bVal - aVal // Descending
  })
})

// Get top 3 winners sorted by totalReturn
const top3Winners = computed(() => {
  const results = [...(backtestStore.strategyResults || [])]
  return results
    .sort((a, b) => {
      const aReturn = a.metrics?.totalReturn ?? 0
      const bReturn = b.metrics?.totalReturn ?? 0
      return bReturn - aReturn // Sort descending
    })
    .slice(0, 3) // Get top 3
})

function formatDate(dateString?: string): string {
  if (!dateString) return ''
  return dayjs(dateString).format('DD-MM-YYYY')
}

function formatPercentage(value: number | null | undefined, isDrawdown: boolean = false): string {
  if (value == null || isNaN(value)) return 'N/A'
  // For drawdown, don't show plus sign (it's always a loss)
  if (isDrawdown) {
    return `${value.toFixed(2)}%`
  }
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
  return returnValue >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'
}

// Get display name for a strategy result by matching it to selected configs
function getStrategyDisplayName(record: StrategyResult): string {
  // Try to match the result to a selected strategy config
  const selectedStrategies = backtestStore.selectedStrategies || []
  
  // Find matching config by strategyId and parameters
  const matchingIndex = selectedStrategies.findIndex((config: StrategyConfig) => {
    if (config.strategyId !== record.strategyId) return false
    
    // Compare parameters
    const recordParams = record.parameters || {}
    const configParams = config.parameters || {}
    
    return isSameStrategyConfig(
      { strategyId: record.strategyId, parameters: recordParams },
      { strategyId: config.strategyId, parameters: configParams }
    )
  })
  
  if (matchingIndex >= 0) {
    const matchingConfig = selectedStrategies[matchingIndex]
    // Use the same display name logic as in ComparisonInputForm
    return getVariantDisplayName(matchingConfig, matchingIndex)
  }
  
  // Fallback to variantName or strategyName if no match found
  return ('variantName' in record && record.variantName && typeof record.variantName === 'string') ? record.variantName : record.strategyName
}

// Get display name for a variant (same logic as ComparisonInputForm)
function getVariantDisplayName(config: StrategyConfig, index?: number): string {
  // If variantName is set, use it
  if (config.variantName) {
    return config.variantName
  }
  
  const strategyNames: Record<string, string> = {
    'lump-sum': t('backtest.strategies.lump-sum'),
    'dca': t('backtest.strategies.dca'),
    'rsi-dca': t('backtest.strategies.rsi-dca'),
    'dip-buyer-dca': t('backtest.strategies.dip-buyer-dca'),
    'moving-average-dca': t('backtest.strategies.moving-average-dca'),
    'combined-smart-dca': t('backtest.strategies.combined-smart-dca'),
    'rebalancing': t('backtest.strategies.rebalancing'),
  }
  
  const baseName = strategyNames[config.strategyId] || config.strategyId
  
  // Auto-generate name with index for same strategy variants
  if (index !== undefined) {
    const selectedStrategies = backtestStore.selectedStrategies || []
    const sameStrategyVariants = selectedStrategies.filter(
      (s, idx) => s.strategyId === config.strategyId && idx <= index
    )
    const variantIndex = sameStrategyVariants.length
    
    const totalVariants = selectedStrategies.filter(
      (s) => s.strategyId === config.strategyId
    ).length
    
    if (totalVariants > 1) {
      return `${baseName} (${variantIndex})`
    }
  }
  
  return baseName
}

function getWinnerRank(record: StrategyResult): number | null {
  // Match by strategyId and parameters to find the exact variant
  const index = top3Winners.value.findIndex((winner) => {
    if (winner.strategyId !== record.strategyId) return false
    // Compare parameters to match exact variant
    const winnerParams = winner.parameters || {}
    const recordParams = record.parameters || {}
    return JSON.stringify(winnerParams) === JSON.stringify(recordParams)
  })
  return index >= 0 ? index + 1 : null
}

function downloadChart() {
  // TODO: Implement chart download functionality
  // This would require getting the chart canvas and converting to image
}

function showTransactions(strategy: StrategyResult) {
  selectedTransactions.value = strategy.transactions || []
  selectedStrategyName.value = getStrategyDisplayName(strategy)
  transactionTypeFilter.value = 'all' // Reset filter when opening modal
  transactionsModalVisible.value = true
  
  // Debug: Log transaction types to help identify issues
  console.log('Transactions for strategy:', selectedStrategyName.value)
  console.log('Transaction types breakdown:', {
    total: selectedTransactions.value.length,
    buy: selectedTransactions.value.filter(tx => (tx.type || 'buy') === 'buy').length,
    sell: selectedTransactions.value.filter(tx => (tx.type || 'buy') === 'sell').length,
    funding: selectedTransactions.value.filter(tx => (tx.type || 'buy') === 'funding').length,
    undefined: selectedTransactions.value.filter(tx => !tx.type).length,
  })
  console.log('Sample transactions:', selectedTransactions.value.slice(0, 5).map(tx => ({
    date: tx.date,
    type: tx.type || 'buy (defaulted)',
    amount: tx.amount,
    quantityPurchased: tx.quantityPurchased,
    reason: tx.reason,
  })))
}
</script>

<style scoped>
/* Mobile-specific card styling that requires deep selectors */
@media (max-width: 768px) {
  .results-panel :deep(.ant-card) {
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .results-panel :deep(.ant-card-head) {
    padding: 16px;
  }

  .results-panel :deep(.ant-card-body) {
    padding: 16px;
  }
}
</style>
