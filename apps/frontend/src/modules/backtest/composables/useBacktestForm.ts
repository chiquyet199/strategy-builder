import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBacktestStore } from '../stores/backtestStore'
import { backtestService } from '../services/backtestService'

export function useBacktestForm() {
  const router = useRouter()
  const backtestStore = useBacktestStore()

  const formState = reactive({
    investmentAmount: backtestStore.investmentAmount,
    startDate: backtestStore.startDate,
    endDate: backtestStore.endDate,
    selectedStrategyIds: [] as string[],
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

    // Build strategy configs
    const strategies = formState.selectedStrategyIds.map((id) =>
      backtestService.buildStrategyConfig(id),
    )
    backtestStore.setSelectedStrategies(strategies)

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

