import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  StrategyConfig,
  BacktestResponse,
  StrategyResult,
  Timeframe,
} from '@/shared/types/backtest'
import { backtestService } from '../services/backtestService'

export const useBacktestStore = defineStore('backtest', () => {
  // State
  const selectedStrategies = ref<StrategyConfig[]>([])
  const investmentAmount = ref<number>(10000)
  const startDate = ref<string>('2020-01-01')
  const endDate = ref<string>('2025-11-28')
  const timeframe = ref<Timeframe>('1d')
  const results = ref<BacktestResponse | null>(null)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Getters
  const hasResults = computed(() => results.value !== null)
  const strategyResults = computed<StrategyResult[]>(() => results.value?.results || [])

  // Actions
  function setSelectedStrategies(strategies: StrategyConfig[]) {
    selectedStrategies.value = strategies
  }

  function setInvestmentAmount(amount: number) {
    investmentAmount.value = amount
  }

  function setDateRange(start: string, end: string) {
    startDate.value = start
    endDate.value = end
  }

  function setTimeframe(tf: Timeframe) {
    timeframe.value = tf
  }

  async function compareStrategies() {
    if (selectedStrategies.value.length === 0) {
      error.value = 'Please select at least one strategy'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await backtestService.compareStrategies({
        investmentAmount: investmentAmount.value,
        startDate: startDate.value,
        endDate: endDate.value,
        strategies: selectedStrategies.value,
        timeframe: timeframe.value,
      })

      // Debug logging
      console.log('Backtest response:', response)
      console.log('Results:', response?.results)
      console.log('Results length:', response?.results?.length)

      results.value = response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to compare strategies'
      results.value = null
    } finally {
      isLoading.value = false
    }
  }

  function clearResults() {
    results.value = null
    error.value = null
  }

  function reset() {
    selectedStrategies.value = []
    investmentAmount.value = 10000
    startDate.value = '2020-01-01'
    endDate.value = '2025-11-28'
    timeframe.value = '1d'
    results.value = null
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    selectedStrategies,
    investmentAmount,
    startDate,
    endDate,
    timeframe,
    results,
    isLoading,
    error,
    // Getters
    hasResults,
    strategyResults,
    // Actions
    setSelectedStrategies,
    setInvestmentAmount,
    setDateRange,
    setTimeframe,
    compareStrategies,
    clearResults,
    reset,
  }
})

