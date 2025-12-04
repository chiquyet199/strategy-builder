import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  StrategyConfig,
  BacktestResponse,
  StrategyResult,
  Timeframe,
  ComparisonMode,
  Variant,
  InitialPortfolio,
  FundingSchedule,
} from '@/shared/types/backtest'
import { backtestService } from '../services/backtestService'

export const useBacktestStore = defineStore('backtest', () => {
  // State
  const selectedStrategies = ref<StrategyConfig[]>([])
  const investmentAmount = ref<number>(100)
  const startDate = ref<string>('2020-01-01')
  const endDate = ref<string>('2025-11-28')
  const timeframe = ref<Timeframe>('1d')
  const results = ref<BacktestResponse | null>(null)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  
  // Form state for preserving selections when navigating back
  const formMode = ref<ComparisonMode>('compare-strategies')
  const formSelectedStrategyIds = ref<StrategyConfig[]>([])
  const formSelectedVariants = ref<Variant[]>([])
  
  // Initial portfolio and funding schedule
  const initialPortfolio = ref<InitialPortfolio | undefined>(undefined)
  const fundingSchedule = ref<FundingSchedule>({
    frequency: 'weekly',
    amount: 100, // Default $100 weekly
  })

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

  function setFormMode(mode: ComparisonMode) {
    formMode.value = mode
  }

  function setFormSelectedStrategyIds(strategyIds: StrategyConfig[]) {
    formSelectedStrategyIds.value = strategyIds
  }

  function setFormSelectedVariants(variants: Variant[]) {
    formSelectedVariants.value = variants
  }

  function setInitialPortfolio(portfolio: InitialPortfolio | undefined) {
    initialPortfolio.value = portfolio
  }

  function setFundingSchedule(schedule: FundingSchedule) {
    fundingSchedule.value = schedule
  }

  async function compareStrategies() {
    if (selectedStrategies.value.length === 0) {
      error.value = 'Please select at least one strategy'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      // Build request: initialPortfolio is required
      const request: any = {
        startDate: startDate.value,
        endDate: endDate.value,
        strategies: selectedStrategies.value,
        timeframe: timeframe.value,
      }

      // Always use initialPortfolio (default to $0 if not set)
      request.initialPortfolio = initialPortfolio.value || {
        assets: [],
        usdcAmount: 0,
      }

      if (fundingSchedule.value.amount > 0) {
        request.fundingSchedule = fundingSchedule.value
      }

      const response = await backtestService.compareStrategies(request)

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
    formMode.value = 'compare-strategies'
    formSelectedStrategyIds.value = []
    formSelectedVariants.value = []
    initialPortfolio.value = undefined
    fundingSchedule.value = {
      frequency: 'weekly',
      amount: 0,
    }
  }

  /**
   * Load comparison configuration from shared config
   * This populates all store state including form state for navigation back
   */
  function loadFromSharedConfig(config: {
    strategies: StrategyConfig[]
    startDate: string
    endDate: string
    timeframe?: Timeframe
    investmentAmount?: number
    initialPortfolio?: InitialPortfolio
    fundingSchedule?: FundingSchedule
  }) {
    // Set basic comparison parameters
    setDateRange(config.startDate, config.endDate)
    if (config.timeframe) {
      setTimeframe(config.timeframe)
    }

    // Set investment configuration
    if (config.initialPortfolio) {
      setInitialPortfolio(config.initialPortfolio)
      // Calculate investment amount from initial portfolio for backward compatibility
      const totalUsdc = config.initialPortfolio.usdcAmount || 0
      const totalAssets = (config.initialPortfolio.assets || []).reduce(
        (sum, asset) => sum + (asset.usdcValue || 0),
        0,
      )
      setInvestmentAmount(totalUsdc + totalAssets)
    } else if (config.investmentAmount) {
      setInvestmentAmount(config.investmentAmount)
      setInitialPortfolio(undefined)
    }

    // Set funding schedule
    if (config.fundingSchedule) {
      setFundingSchedule(config.fundingSchedule)
    } else {
      setFundingSchedule({
        frequency: 'weekly',
        amount: 0,
      })
    }

    // Set strategies
    setSelectedStrategies(config.strategies)

    // Determine form mode based on strategies
    // If strategies have variantName, it's compare-variants mode
    const hasVariants = config.strategies.some((s) => s.variantName)
    if (hasVariants) {
      setFormMode('compare-variants')
      // Convert strategies to variants format
      const variants: Variant[] = config.strategies.map((s) => ({
        strategyId: s.strategyId,
        variantName: s.variantName || s.strategyId,
        parameters: s.parameters || {},
      }))
      setFormSelectedVariants(variants)
      setFormSelectedStrategyIds([])
    } else {
      setFormMode('compare-strategies')
      setFormSelectedStrategyIds(config.strategies)
      setFormSelectedVariants([])
    }
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
    formMode,
    formSelectedStrategyIds,
    formSelectedVariants,
    initialPortfolio,
    fundingSchedule,
    // Getters
    hasResults,
    strategyResults,
    // Actions
    setSelectedStrategies,
    setInvestmentAmount,
    setDateRange,
    setTimeframe,
    setFormMode,
    setFormSelectedStrategyIds,
    setFormSelectedVariants,
    setInitialPortfolio,
    setFundingSchedule,
    compareStrategies,
    clearResults,
    reset,
    loadFromSharedConfig,
  }
})

