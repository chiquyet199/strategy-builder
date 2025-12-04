<template>
  <div class="basic-form">
      <!-- Investment Input -->
      <a-form-item required>
        <template #label>
          <label class="block text-sm font-bold text-gray-900 mb-2">
            I want to invest:
          </label>
        </template>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-base z-10">$</span>
          <input
            v-model.number="investmentAmountDisplay"
            type="text"
            inputmode="numeric"
            class="w-full pl-7 pr-3 py-2.5 text-base font-semibold text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400"
            placeholder="10,000"
            @input="handleInvestmentInput"
          />
        </div>
      </a-form-item>

      <!-- Strategy Selection -->
      <a-form-item required>
        <template #label>
          <label class="block text-sm font-bold text-gray-900 mb-2">
            Select strategies to compare:
          </label>
        </template>
        <div class="grid grid-cols-1 gap-2">
          <div
            v-for="strategy in availableStrategies"
            :key="strategy.key"
            :class="[
              'strategy-card relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200',
              isStrategySelected(strategy.key)
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
            ]"
            @click="() => handleStrategyToggle(strategy.key, !isStrategySelected(strategy.key))"
          >
            <!-- Checkbox -->
            <div class="flex items-start gap-2 mb-2">
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
              <h3 class="text-sm font-bold text-gray-900 leading-tight">
                {{ strategy.displayName }}
              </h3>
            </div>
            
            <!-- Description -->
            <p class="text-xs text-gray-600 leading-snug ml-7">
              {{ strategy.description }}
            </p>
          </div>
        </div>
      </a-form-item>

      <!-- Popular Comparison -->
      <a-form-item>
        <div class="text-center mb-3">
          <p class="text-xs text-gray-500 mb-2">↓ Or try a popular comparison</p>
          <button
            type="button"
            class="popular-link text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
            @click="loadPopularComparison"
          >
            "$10k DCA vs Lump Sum 2020-2025" →
          </button>
        </div>
      </a-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormState } from '../composables/useBacktestForm'

interface Props {
  formState: FormState
  showAdvancedPortfolioModal: boolean
}

interface Emits {
  (e: 'update:show-advanced-portfolio-modal', value: boolean): void
  (e: 'date-range-change', dates: { startDate: string; endDate: string }): void
  (e: 'apply-date-preset', preset: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

// Available strategies (simplified names for beginners)
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

const investmentAmountDisplay = computed({
  get: () => formatNumber(props.formState.investmentAmount || 10000),
  set: (value: string) => {
    const numValue = parseNumber(value)
    if (numValue > 0) {
      props.formState.investmentAmount = numValue
    }
  }
})

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
    props.formState.investmentAmount = numValue
  }
}

// Check if strategy is selected
const isStrategySelected = (key: string) => {
  return props.formState.selectedStrategyIds.some((s) => {
    const strategy = availableStrategies.find((as) => as.key === key)
    if (!strategy) return false
    return s.strategyId === strategy.id && 
           JSON.stringify(s.parameters || {}) === JSON.stringify(strategy.params || {})
  })
}

// Handle strategy toggle
const handleStrategyToggle = (key: string, checked: boolean) => {
  const strategy = availableStrategies.find((s) => s.key === key)
  if (!strategy) return

  if (checked) {
    props.formState.selectedStrategyIds.push({
      strategyId: strategy.id,
      ...(strategy.params && Object.keys(strategy.params).length > 0 && { parameters: strategy.params }),
    })
  } else {
    props.formState.selectedStrategyIds = props.formState.selectedStrategyIds.filter((s) => {
      return !(s.strategyId === strategy.id && 
               JSON.stringify(s.parameters || {}) === JSON.stringify(strategy.params || {}))
    })
  }
}

// Load popular comparison
const loadPopularComparison = () => {
  props.formState.investmentAmount = 10000
  
  props.formState.selectedStrategyIds = [
    { strategyId: 'dca' }, // Weekly DCA
    { strategyId: 'lump-sum' },
  ]
  
  // Set default date range
  props.formState.startDate = '2020-01-01'
  props.formState.endDate = '2025-11-28'
  emit('date-range-change', {
    startDate: '2020-01-01',
    endDate: '2025-11-28',
  })
}

// Watch formState to sync selectedStrategyIds and ensure mode is compare-strategies
watch(() => props.formState.selectedStrategyIds, () => {
  // Ensure mode is set to compare-strategies for basic form
  props.formState.mode = 'compare-strategies'
}, { deep: true })
</script>

<style scoped>
.strategy-card {
  min-height: 80px;
}

.checkbox-wrapper {
  cursor: pointer;
}

</style>

