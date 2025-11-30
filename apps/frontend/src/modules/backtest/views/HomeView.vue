<template>
  <div class="home-view">
    <a-card class="strategy-selection-card">
      <template #title>
        <h1>{{ t('backtest.title') }}</h1>
      </template>

      <a-form :model="formState" layout="vertical" @submit.prevent="handleCompare">
        <!-- Investment Amount -->
        <a-form-item :label="t('backtest.investmentAmount')" required>
          <a-input-number
            v-model:value="formState.investmentAmount"
            :min="1"
            :max="10000000"
            :step="1000"
            :formatter="(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
            :parser="(value) => value.replace(/\$\s?|(,*)/g, '')"
            style="width: 100%"
            size="large"
          />
        </a-form-item>

        <!-- Date Range Slider -->
        <a-form-item :label="t('backtest.dateRange')" required>
          <DateRangeSlider
            :initial-start-date="formState.startDate"
            :initial-end-date="formState.endDate"
            @change="handleDateRangeChange"
          />
        </a-form-item>

        <!-- Mode Selection -->
        <a-form-item :label="t('backtest.mode.label')" required>
          <ModeSelection v-model="formState.mode" />
        </a-form-item>
        <span>formState :{{ formState.mode }}</span>
        <!-- Strategy Selection (Compare Strategies Mode) -->
        <a-form-item
          v-if="formState.mode === 'compare-strategies'"
          :label="t('backtest.selectStrategies')"
          required
        >
          <StrategySelection v-model="formState.selectedStrategyIds" />
        </a-form-item>

        <!-- Parameter Variant Selection (Compare Variants Mode) -->
        <a-form-item
          v-if="formState.mode === 'compare-variants'"
          :label="t('backtest.variantMode.label')"
          required
          :key="'variant-mode'"
        >
          <ParameterVariantSelection
            :model-value="formState.selectedVariants"
            @update:model-value="(value: Variant[]) => (formState.selectedVariants = value)"
          />
        </a-form-item>

        <!-- Error Message -->
        <a-alert
          v-if="backtestStore.error"
          :message="backtestStore.error"
          type="error"
          show-icon
          closable
          @close="backtestStore.error = null"
          style="margin-bottom: 16px"
        />

        <!-- Submit Button -->
        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            :loading="backtestStore.isLoading"
            :disabled="
              (formState.mode === 'compare-strategies' &&
                formState.selectedStrategyIds.length === 0) ||
              (formState.mode === 'compare-variants' && formState.selectedVariants.length === 0)
            "
            block
          >
            {{ t('backtest.compareStrategies') }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useBacktestStore } from '../stores/backtestStore'
import { useBacktestForm } from '../composables/useBacktestForm'
import DateRangeSlider from '../components/DateRangeSlider.vue'
import StrategySelection from '../components/StrategySelection.vue'
import ModeSelection from '../components/ModeSelection.vue'
import ParameterVariantSelection from '../components/ParameterVariantSelection.vue'
import type { Variant } from '@/shared/types/backtest'

const { t } = useI18n()
const backtestStore = useBacktestStore()
const { formState, handleDateRangeChange, handleCompare } = useBacktestForm()
</script>

<style scoped>
.home-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.strategy-selection-card {
  margin-top: 24px;
}

.strategy-selection-card h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}
</style>
