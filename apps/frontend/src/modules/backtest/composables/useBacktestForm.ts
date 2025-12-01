import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBacktestStore } from '../stores/backtestStore'
import type { StrategyConfig, ComparisonMode, Variant, Timeframe } from '@/shared/types/backtest'

interface FormState {
  investmentAmount: number
  startDate: string
  endDate: string
  timeframe: Timeframe
  mode: ComparisonMode
  selectedStrategyIds: StrategyConfig[]
  selectedVariants: Variant[]
}

export function useBacktestForm() {
  const router = useRouter()
  const backtestStore = useBacktestStore()

  const formState = reactive<FormState>({
    investmentAmount: backtestStore.investmentAmount,
    startDate: backtestStore.startDate,
    endDate: backtestStore.endDate,
    timeframe: backtestStore.timeframe,
    mode: backtestStore.formMode,
    selectedStrategyIds: [...backtestStore.formSelectedStrategyIds],
    selectedVariants: [...backtestStore.formSelectedVariants],
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
    backtestStore.setInvestmentAmount(formState.investmentAmount)
    backtestStore.setDateRange(formState.startDate, formState.endDate)
    backtestStore.setTimeframe(formState.timeframe)

    // Save form state for restoration when navigating back
    backtestStore.setFormMode(formState.mode)
    backtestStore.setFormSelectedStrategyIds([...formState.selectedStrategyIds])
    backtestStore.setFormSelectedVariants([...formState.selectedVariants])

    // Set strategies for comparison
    backtestStore.setSelectedStrategies(strategiesToCompare)

    // Run comparison
    await backtestStore.compareStrategies()

    // Navigate to results if successful
    if (backtestStore.hasResults) {
      router.push('/backtest/results')
    }
  }

  onMounted(() => {
    // Initialize form with store values (preserves state when navigating back)
    formState.investmentAmount = backtestStore.investmentAmount
    formState.startDate = backtestStore.startDate
    formState.endDate = backtestStore.endDate
    formState.timeframe = backtestStore.timeframe
    formState.mode = backtestStore.formMode
    formState.selectedStrategyIds = [...backtestStore.formSelectedStrategyIds]
    formState.selectedVariants = [...backtestStore.formSelectedVariants]
  })

  return {
    formState,
    handleDateRangeChange,
    handleCompare,
  }
}

