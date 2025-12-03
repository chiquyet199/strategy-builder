<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
    <!-- Hero Section -->
    <div class="hero-section relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500"></div>
      <div class="absolute inset-0 opacity-30" style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
      
      <div class="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 text-center">
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 leading-tight">
          What if you had invested differently?
        </h1>
        <p class="text-sm sm:text-base md:text-lg text-white/90 max-w-2xl mx-auto">
          See how Bitcoin strategies performed 2020-2025
        </p>
      </div>
    </div>

    <!-- Main Form Section -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
        <!-- Investment Input -->
        <div class="mb-4 sm:mb-5">
          <label class="block text-sm sm:text-base font-bold text-gray-900 mb-2">
            I want to invest:
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-base z-10">$</span>
            <input
              v-model.number="investmentAmountDisplay"
              type="text"
              inputmode="numeric"
              class="w-full pl-7 pr-3 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400"
              placeholder="10,000"
              @input="handleInvestmentInput"
            />
          </div>
        </div>

        <!-- Strategy Selection -->
        <div class="mb-4 sm:mb-5">
          <label class="block text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">
            Select strategies to compare:
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            <div
              v-for="strategy in availableStrategies"
              :key="strategy.key"
              :class="[
                'strategy-card relative p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
                isStrategySelected(strategy.key)
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
              ]"
              @click="() => handleStrategyToggle(strategy.key, !isStrategySelected(strategy.key))"
            >
              <!-- Checkbox -->
              <div class="flex items-start gap-2 sm:gap-3 mb-2">
                <div
                  :class="[
                    'checkbox-wrapper flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    isStrategySelected(strategy.key)
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'bg-white border-gray-300'
                  ]"
                  @click.stop="() => handleStrategyToggle(strategy.key, !isStrategySelected(strategy.key))"
                >
                  <svg
                    v-if="isStrategySelected(strategy.key)"
                    class="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 class="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                  {{ strategy.displayName }}
                </h3>
              </div>
              
              <!-- Description -->
              <p class="text-xs sm:text-sm text-gray-600 leading-snug ml-7 sm:ml-8">
                {{ strategy.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Compare Button -->
        <div class="text-center mb-3 sm:mb-4 mt-4 sm:mt-5">
          <button
            :disabled="selectedStrategies.length === 0 || isLoading"
            :class="[
              'compare-button w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white rounded-lg transition-all duration-200 shadow-md',
              selectedStrategies.length === 0 || isLoading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg hover:scale-105 active:scale-100'
            ]"
            @click="handleCompare"
          >
            <span v-if="!isLoading">Compare Strategies →</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Comparing...
            </span>
          </button>
        </div>

        <!-- Popular Comparison -->
        <div class="text-center mb-2 sm:mb-3">
          <p class="text-xs sm:text-sm text-gray-500 mb-1.5 sm:mb-2">↓ Or try a popular comparison</p>
          <button
            class="popular-link text-sm sm:text-base font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
            @click="loadPopularComparison"
          >
            "$10k DCA vs Lump Sum 2020-2025" →
          </button>
        </div>

        <!-- Link to Advanced Mode -->
        <div class="text-center pt-3 sm:pt-4 border-t border-gray-200">
          <button
            class="text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
            @click="goToAdvanced"
          >
            Advanced Options →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBacktestStore } from '../stores/backtestStore'

const router = useRouter()
const { t } = useI18n()
const backtestStore = useBacktestStore()

// Available strategies (simplified names for beginners)
// Using unique keys to handle Weekly DCA and Monthly DCA separately
const availableStrategies = [
  {
    key: 'lump-sum',
    id: 'lump-sum',
    displayName: t('backtest.strategies.lump-sum'),
    description: t('backtest.strategyDescriptions.lump-sum'),
    params: undefined,
  },
  {
    key: 'dca-weekly',
    id: 'dca',
    displayName: 'Weekly DCA',
    description: t('backtest.strategyDescriptions.dca'),
    params: undefined,
  },
  {
    key: 'dca-monthly',
    id: 'dca',
    displayName: 'Monthly DCA',
    description: t('backtest.strategyDescriptions.dca'),
    params: { frequency: 'monthly' },
  },
  {
    key: 'rsi-dca',
    id: 'rsi-dca',
    displayName: t('backtest.strategies.rsi-dca'),
    description: t('backtest.strategyDescriptions.rsi-dca'),
    params: undefined,
  },
  {
    key: 'dip-buyer-dca',
    id: 'dip-buyer-dca',
    displayName: t('backtest.strategies.dip-buyer-dca'),
    description: t('backtest.strategyDescriptions.dip-buyer-dca'),
    params: undefined,
  },
  {
    key: 'combined-smart-dca',
    id: 'combined-smart-dca',
    displayName: t('backtest.strategies.combined-smart-dca'),
    description: t('backtest.strategyDescriptions.combined-smart-dca'),
    params: undefined,
  },
]

const investmentAmount = ref(10000)
const investmentAmountDisplay = computed(() => formatNumber(investmentAmount.value))
const selectedStrategies = ref<Array<{ key: string; id: string; params?: Record<string, unknown> }>>([])

const isLoading = computed(() => backtestStore.isLoading)

// Format number with commas
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Parse number from formatted string
const parseNumber = (str: string): number => {
  return parseInt(str.replace(/,/g, ''), 10) || 0
}

// Handle investment input
const handleInvestmentInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/[^0-9,]/g, '')
  const numValue = parseNumber(value)
  
  if (numValue > 0) {
    investmentAmount.value = numValue
    investmentAmountDisplay.value = formatNumber(numValue)
    backtestStore.setInvestmentAmount(numValue)
  } else {
    investmentAmountDisplay.value = ''
  }
}

// Check if strategy is selected
const isStrategySelected = (key: string) => {
  return selectedStrategies.value.some((s) => s.key === key)
}

// Handle strategy toggle
const handleStrategyToggle = (key: string, checked: boolean) => {
  const strategy = availableStrategies.find((s) => s.key === key)
  if (!strategy) return

  if (checked) {
    selectedStrategies.value.push({
      key: strategy.key,
      id: strategy.id,
      params: strategy.params,
    })
  } else {
    selectedStrategies.value = selectedStrategies.value.filter((s) => s.key !== key)
  }
}

// Handle compare
const handleCompare = async () => {
  if (selectedStrategies.value.length === 0) {
    return
  }

  // Set investment amount
  backtestStore.setInvestmentAmount(investmentAmount.value)

  // Set date range (default: 2020-2025)
  backtestStore.setDateRange('2020-01-01', '2025-11-28')

  // Set timeframe (default: daily)
  backtestStore.setTimeframe('1d')

  // Convert selected strategies to StrategyConfig format
  const strategyConfigs = selectedStrategies.value.map((s) => ({
    strategyId: s.id,
    ...(s.params && Object.keys(s.params).length > 0 && { parameters: s.params }),
  }))

  backtestStore.setSelectedStrategies(strategyConfigs)

  // Navigate to results
  await backtestStore.compareStrategies()
  router.push('/backtest/results')
}

// Load popular comparison
const loadPopularComparison = () => {
  investmentAmount.value = 10000
  investmentAmountDisplay.value = '10,000'
  backtestStore.setInvestmentAmount(10000)
  
  selectedStrategies.value = [
    { key: 'dca-weekly', id: 'dca', params: undefined }, // Weekly DCA
    { key: 'lump-sum', id: 'lump-sum', params: undefined },
  ]
  
  handleCompare()
}

// Go to advanced mode
const goToAdvanced = () => {
  // Preserve current selections
  backtestStore.setInvestmentAmount(investmentAmount.value)
  const strategyConfigs = selectedStrategies.value.map((s) => ({
    strategyId: s.id,
    ...(s.params && Object.keys(s.params).length > 0 && { parameters: s.params }),
  }))
  backtestStore.setSelectedStrategies(strategyConfigs)
  
  router.push('/backtest')
}

// Initialize from store if available
onMounted(() => {
  if (backtestStore.investmentAmount) {
    investmentAmount.value = backtestStore.investmentAmount
    investmentAmountDisplay.value = formatNumber(backtestStore.investmentAmount)
  }
  
  if (backtestStore.selectedStrategies.length > 0) {
    // Map store strategies back to our format
    selectedStrategies.value = backtestStore.selectedStrategies.map((s) => {
      // Find matching strategy by id and params
      const match = availableStrategies.find(
        (as) =>
          as.id === s.strategyId &&
          JSON.stringify(as.params || {}) === JSON.stringify(s.parameters || {})
      )
      return {
        key: match?.key || s.strategyId,
        id: s.strategyId,
        params: s.parameters,
      }
    })
  }
})
</script>

<style scoped>
.hero-section {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 640px) {
  .hero-section {
    min-height: 200px;
  }
}

.strategy-card {
  min-height: 100px;
}

@media (min-width: 640px) {
  .strategy-card {
    min-height: 110px;
  }
}

@media (min-width: 1024px) {
  .strategy-card {
    min-height: 100px;
  }
}

.checkbox-wrapper {
  cursor: pointer;
}

.compare-button:disabled {
  transform: none !important;
}

.compare-button:not(:disabled):active {
  transform: scale(0.98);
}
</style>
