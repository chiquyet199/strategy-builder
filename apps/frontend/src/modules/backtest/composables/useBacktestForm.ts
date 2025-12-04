import { reactive, onMounted, onUnmounted, watch } from 'vue'
import { useBacktestStore } from '../stores/backtestStore'
import type { StrategyConfig, ComparisonMode, Variant, Timeframe, InitialPortfolio, FundingSchedule } from '@/shared/types/backtest'

export interface FormState {
  startDate: string
  endDate: string
  timeframe: Timeframe
  mode: ComparisonMode
  selectedStrategyIds: StrategyConfig[]
  selectedVariants: Variant[]
  // Initial portfolio (required - must be configured)
  initialPortfolio?: InitialPortfolio
  // Periodic funding
  fundingSchedule: FundingSchedule
}

export function useBacktestForm() {
  const backtestStore = useBacktestStore()

  const formState = reactive<FormState>({
    startDate: backtestStore.startDate,
    endDate: backtestStore.endDate,
    timeframe: backtestStore.timeframe,
    mode: backtestStore.formMode,
    selectedStrategyIds: [...backtestStore.formSelectedStrategyIds],
    selectedVariants: [...backtestStore.formSelectedVariants],
    initialPortfolio: backtestStore.initialPortfolio ? { ...backtestStore.initialPortfolio } : undefined,
    fundingSchedule: {
      frequency: backtestStore.fundingSchedule.frequency,
      amount: backtestStore.fundingSchedule.amount,
    },
  })

  function handleDateRangeChange(dates: { startDate: string; endDate: string }) {
    formState.startDate = dates.startDate
    formState.endDate = dates.endDate
  }

  async function handleCompare() {
    let strategiesToCompare: StrategyConfig[] = []

    if (formState.mode === 'compare-strategies') {
      if (formState.selectedStrategyIds.length === 0) {
        return
      }
      strategiesToCompare = formState.selectedStrategyIds
    } else {
      // compare-variants mode
      if (formState.selectedVariants.length === 0) {
        return
      }
      // Convert variants to StrategyConfig format with variantName
      strategiesToCompare = formState.selectedVariants.map((variant) => ({
        strategyId: variant.strategyId,
        variantName: variant.variantName,
        parameters: variant.parameters,
      }))
    }

    // Update store with form values
    backtestStore.setDateRange(formState.startDate, formState.endDate)
    backtestStore.setTimeframe(formState.timeframe)

    // Save form state for restoration when navigating back
    backtestStore.setFormMode(formState.mode)
    backtestStore.setFormSelectedStrategyIds([...formState.selectedStrategyIds])
    backtestStore.setFormSelectedVariants([...formState.selectedVariants])

    // Set strategies for comparison
    backtestStore.setSelectedStrategies(strategiesToCompare)

    // Set initial portfolio and funding schedule
    backtestStore.setInitialPortfolio(formState.initialPortfolio)
    backtestStore.setFundingSchedule(formState.fundingSchedule)
    
    // If no initial portfolio is set, create a default one with $0 USDC
    // This allows strategies to work with periodic funding only
    if (!formState.initialPortfolio) {
      backtestStore.setInitialPortfolio({
        assets: [],
        usdcAmount: 0,
      })
    }

    // Run comparison (results will be displayed in the right panel)
    await backtestStore.compareStrategies()
  }

  function syncFormFromStore() {
    // Sync form with store values (preserves state when navigating back or loading shared config)
    formState.startDate = backtestStore.startDate
    formState.endDate = backtestStore.endDate
    formState.timeframe = backtestStore.timeframe
    formState.mode = backtestStore.formMode
    // Deep copy to ensure reactivity and preserve all properties
    formState.selectedStrategyIds = backtestStore.formSelectedStrategyIds.map(s => ({
      strategyId: s.strategyId,
      variantName: s.variantName,
      parameters: s.parameters ? { ...s.parameters } : undefined,
    }))
    formState.selectedVariants = backtestStore.formSelectedVariants.map(v => ({
      strategyId: v.strategyId,
      variantName: v.variantName,
      parameters: v.parameters ? { ...v.parameters } : {},
    }))
    // Restore initial portfolio and funding schedule
    formState.initialPortfolio = backtestStore.initialPortfolio
      ? {
          assets: [...backtestStore.initialPortfolio.assets],
          usdcAmount: backtestStore.initialPortfolio.usdcAmount,
        }
      : undefined
    formState.fundingSchedule = {
      frequency: backtestStore.fundingSchedule.frequency,
      amount: backtestStore.fundingSchedule.amount,
    }
  }

  onMounted(() => {
    syncFormFromStore()
    
    // Watch for store changes (e.g., when shared config is loaded)
    const unwatch = watch(
      () => [
        backtestStore.formSelectedStrategyIds,
        backtestStore.formSelectedVariants,
        backtestStore.startDate,
        backtestStore.endDate,
        backtestStore.timeframe,
        backtestStore.formMode,
        backtestStore.initialPortfolio,
        backtestStore.fundingSchedule,
      ],
      () => {
        syncFormFromStore()
      },
      { deep: true }
    )
    
    // Cleanup watcher on unmount
    onUnmounted(() => {
      unwatch()
    })
  })

  return {
    formState,
    handleDateRangeChange,
    handleCompare,
  }
}

