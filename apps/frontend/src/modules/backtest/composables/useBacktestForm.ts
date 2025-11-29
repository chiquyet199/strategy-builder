import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBacktestStore } from '../stores/backtestStore'
import type { StrategyConfig } from '@/shared/types/backtest'

export function useBacktestForm() {
  const router = useRouter()
  const backtestStore = useBacktestStore()

  const formState = reactive({
    investmentAmount: backtestStore.investmentAmount,
    startDate: backtestStore.startDate,
    endDate: backtestStore.endDate,
    selectedStrategyIds: [] as StrategyConfig[],
  })

  function handleDateRangeChange(dates: { startDate: string; endDate: string }) {
    formState.startDate = dates.startDate
    formState.endDate = dates.endDate
  }

  async function handleCompare() {
    if (formState.selectedStrategyIds.length === 0) {
      return
    }

    // Update store with form values
    backtestStore.setInvestmentAmount(formState.investmentAmount)
    backtestStore.setDateRange(formState.startDate, formState.endDate)

    // Build strategy configs with parameters
    // formState.selectedStrategyIds is already in StrategyConfig format
    backtestStore.setSelectedStrategies(formState.selectedStrategyIds)

    // Run comparison
    await backtestStore.compareStrategies()

    // Navigate to results if successful
    if (backtestStore.hasResults) {
      router.push('/backtest/results')
    }
  }

  onMounted(() => {
    // Initialize form with store values
    formState.investmentAmount = backtestStore.investmentAmount
    formState.startDate = backtestStore.startDate
    formState.endDate = backtestStore.endDate
  })

  return {
    formState,
    handleDateRangeChange,
    handleCompare,
  }
}

