<template>
  <div class="strategy-summary-cards">
    <div class="cards-grid">
      <div
        v-for="(result, index) in sortedResults"
        :key="result.strategyId + '-' + index"
        class="strategy-card"
        :class="{ 'winner': index === 0, 'runner-up': index === 1, 'third': index === 2 }"
      >
        <!-- Rank Badge -->
        <div class="rank-badge">
          <span v-if="index === 0" class="rank-icon">🥇</span>
          <span v-else-if="index === 1" class="rank-icon">🥈</span>
          <span v-else-if="index === 2" class="rank-icon">🥉</span>
          <span v-else class="rank-number">#{{ index + 1 }}</span>
        </div>

        <!-- Strategy Name -->
        <div class="strategy-name">
          {{ getDisplayName(result) }}
        </div>

        <!-- Key Metrics -->
        <div class="metrics-grid">
          <!-- Total Return -->
          <div class="metric">
            <div class="metric-label">Return</div>
            <div 
              class="metric-value"
              :class="(result.metrics?.totalReturn ?? 0) >= 0 ? 'positive' : 'negative'"
            >
              {{ formatPercentage(result.metrics?.totalReturn) }}
            </div>
          </div>

          <!-- Final Value -->
          <div class="metric">
            <div class="metric-label">Final Value</div>
            <div class="metric-value">
              ${{ formatNumber(result.metrics?.finalValue) }}
            </div>
          </div>
        </div>

        <!-- Portfolio Summary -->
        <div class="portfolio-summary">
          <div class="portfolio-title">Portfolio</div>
          <div class="portfolio-holdings">
            <div class="holding">
              <span class="holding-icon">₿</span>
              <span class="holding-value">{{ formatQuantity(getFinalQuantity(result)) }}</span>
              <span class="holding-label">BTC</span>
            </div>
            <div class="holding">
              <span class="holding-icon">💵</span>
              <span class="holding-value">${{ formatNumber(getFinalUsdc(result)) }}</span>
              <span class="holding-label">USDC</span>
            </div>
          </div>
        </div>

        <!-- Additional Stats Row -->
        <div class="stats-row">
          <div class="stat">
            <span class="stat-label">Invested:</span>
            <span class="stat-value">${{ formatNumber(result.metrics?.totalInvestment) }}</span>
          </div>
          <div class="stat clickable" @click="handleTransactionsClick(result)">
            <span class="stat-label">Transactions:</span>
            <span class="stat-value tx-link">{{ result.transactions?.length || 0 }}</span>
          </div>
        </div>

        <!-- Profit Taken (if any) -->
        <div v-if="(result.metrics?.totalProfitTaken ?? 0) > 0" class="profit-taken">
          <span class="profit-label">💰 Profit Taken:</span>
          <span class="profit-value">${{ formatNumber(result.metrics?.totalProfitTaken) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StrategyResult } from '@/shared/types/backtest'

interface Props {
  results: StrategyResult[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  showTransactions: [result: StrategyResult]
}>()

// Sort by total return descending
const sortedResults = computed(() => {
  return [...props.results].sort((a, b) => {
    const aReturn = a.metrics?.totalReturn ?? 0
    const bReturn = b.metrics?.totalReturn ?? 0
    return bReturn - aReturn
  })
})

function getDisplayName(result: StrategyResult): string {
  return result.variantName || result.strategyName
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
  if (value == null || isNaN(value)) return '0'
  return value.toFixed(6)
}

// Get final BTC quantity from last transaction or portfolio history
function getFinalQuantity(result: StrategyResult): number {
  // Try from last transaction's portfolioValue
  if (result.transactions && result.transactions.length > 0) {
    const lastTx = result.transactions[result.transactions.length - 1]
    if (lastTx.portfolioValue?.quantityHeld != null) {
      return lastTx.portfolioValue.quantityHeld
    }
  }
  // Fallback to metrics totalQuantity
  return result.metrics?.totalQuantity ?? 0
}

// Get final USDC from last transaction's portfolioValue
function getFinalUsdc(result: StrategyResult): number {
  if (result.transactions && result.transactions.length > 0) {
    const lastTx = result.transactions[result.transactions.length - 1]
    if (lastTx.portfolioValue?.usdcValue != null) {
      return lastTx.portfolioValue.usdcValue
    }
  }
  // Fallback: calculate from final value - (quantity * avg price approximation)
  const finalValue = result.metrics?.finalValue ?? 0
  const quantity = result.metrics?.totalQuantity ?? 0
  const avgPrice = result.metrics?.avgBuyPrice ?? 0
  if (quantity > 0 && avgPrice > 0) {
    return Math.max(0, finalValue - (quantity * avgPrice))
  }
  return 0
}

function handleTransactionsClick(result: StrategyResult) {
  emit('showTransactions', result)
}
</script>

<style scoped>
.strategy-summary-cards {
  margin-bottom: 24px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.strategy-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}

.strategy-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.strategy-card.winner {
  background: linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%);
  border-color: #f59e0b;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
}

.strategy-card.runner-up {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #94a3b8;
}

.strategy-card.third {
  background: linear-gradient(135deg, #fef3e2 0%, #fed7aa 100%);
  border-color: #f97316;
}

.rank-badge {
  position: absolute;
  top: -8px;
  right: 12px;
  background: white;
  padding: 4px 8px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-weight: 600;
}

.rank-icon {
  font-size: 20px;
}

.rank-number {
  font-size: 14px;
  color: #64748b;
}

.strategy-name {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
  padding-right: 40px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.metric {
  text-align: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
}

.metric-label {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.metric-value.positive {
  color: #16a34a;
}

.metric-value.negative {
  color: #dc2626;
}

/* Portfolio Summary */
.portfolio-summary {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.portfolio-title {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.portfolio-holdings {
  display: flex;
  justify-content: space-around;
  gap: 12px;
}

.holding {
  display: flex;
  align-items: center;
  gap: 6px;
}

.holding-icon {
  font-size: 16px;
}

.holding-value {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.holding-label {
  font-size: 11px;
  color: #64748b;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 8px;
}

.stat {
  font-size: 12px;
}

.stat.clickable {
  cursor: pointer;
}

.stat.clickable:hover .tx-link {
  text-decoration: underline;
  color: #2563eb;
}

.stat-label {
  color: #64748b;
}

.stat-value {
  font-weight: 600;
  color: #475569;
  margin-left: 4px;
}

.stat-value.tx-link {
  color: #2563eb;
}

.profit-taken {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  padding: 8px 12px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profit-label {
  font-size: 12px;
  color: #166534;
  font-weight: 500;
}

.profit-value {
  font-size: 16px;
  font-weight: 700;
  color: #16a34a;
}

/* Responsive */
@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

