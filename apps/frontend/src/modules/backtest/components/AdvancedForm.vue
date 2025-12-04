<template>
  <div class="advanced-form">
      <!-- Investment Amount Section (Simple Mode) -->
      <a-form-item v-if="!formState.initialPortfolio" required>
        <template #label>
          <span>
            {{ t('backtest.form.investmentAmount.label') }}
            <a-tooltip :title="t('backtest.form.investmentAmount.tooltip')">
              <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
            </a-tooltip>
          </span>
        </template>
        <template #extra>
          <span class="helper-text">{{ t('backtest.form.investmentAmount.helper') }}</span>
        </template>

        <!-- Quick Select Buttons -->
        <div class="quick-select-buttons">
          <a-button
            v-for="amount in quickSelectAmounts"
            :key="amount"
            :type="formState.investmentAmount === amount ? 'primary' : 'default'"
            size="small"
            @click="formState.investmentAmount = amount"
          >
            ${{ amount.toLocaleString() }}
          </a-button>
        </div>

        <!-- Custom Amount Input -->
        <a-input-number
          v-model:value="formState.investmentAmount"
          :min="1"
          :max="10000000"
          :step="1000"
          :formatter="(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
          :parser="(value) => value.replace(/\$\s?|(,*)/g, '')"
          style="width: 100%"
          size="large"
          class="investment-input"
        />
        <!-- Advanced Portfolio Setup Link -->
        <div style="margin-top: 8px;">
          <a-button type="link" size="small" @click="$emit('update:show-advanced-portfolio-modal', true)">
            {{ t('backtest.form.advancedPortfolio.setup') }}
          </a-button>
        </div>
      </a-form-item>

      <!-- Portfolio Info Display (Advanced Mode) -->
      <a-form-item v-if="formState.initialPortfolio">
        <template #label>
          <span>
            {{ t('backtest.form.advancedPortfolio.currentPortfolio') }}
            <a-tooltip :title="t('backtest.form.advancedPortfolio.currentPortfolioTooltip')">
              <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
            </a-tooltip>
          </span>
        </template>
        <a-card size="small" class="portfolio-info-card">
          <a-descriptions :column="1" size="small" bordered>
            <a-descriptions-item :label="t('backtest.form.advancedPortfolio.preview.assets')">
              <div v-if="formState.initialPortfolio.assets.length === 0" style="color: #8c8c8c;">
                {{ t('backtest.form.advancedPortfolio.preview.noAssets') }}
              </div>
              <div v-else>
                <div v-for="(asset, index) in formState.initialPortfolio.assets" :key="index" style="margin-bottom: 4px;">
                  <a-tag color="blue">{{ asset.quantity }} {{ asset.symbol }}</a-tag>
                </div>
              </div>
            </a-descriptions-item>
            <a-descriptions-item :label="t('backtest.form.advancedPortfolio.preview.usdc')">
              <span style="font-weight: 500;">${{ formState.initialPortfolio.usdcAmount.toLocaleString() }}</span>
            </a-descriptions-item>
          </a-descriptions>
          <div style="margin-top: 12px; text-align: right;">
            <a-button type="link" size="small" @click="$emit('update:show-advanced-portfolio-modal', true)">
              {{ t('backtest.form.advancedPortfolio.edit') }}
            </a-button>
            <a-button type="link" size="small" danger @click="formState.initialPortfolio = undefined">
              {{ t('backtest.form.advancedPortfolio.resetToSimple') }}
            </a-button>
          </div>
        </a-card>
      </a-form-item>

      <!-- Periodic Funding Section -->
      <a-form-item>
        <template #label>
          <span>
            {{ t('backtest.form.fundingSchedule.label') }}
            <a-tooltip :title="t('backtest.form.fundingSchedule.tooltip')">
              <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
            </a-tooltip>
          </span>
        </template>
        <template #extra>
          <span class="helper-text">{{ t('backtest.form.fundingSchedule.helper') }}</span>
        </template>

        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          <a-form-item :label="t('backtest.form.fundingSchedule.frequency.label')" style="flex: 1; min-width: 150px;">
            <a-select v-model:value="formState.fundingSchedule.frequency" style="width: 100%">
              <a-select-option value="daily">{{ t('backtest.form.fundingSchedule.frequency.daily') }}</a-select-option>
              <a-select-option value="weekly">{{ t('backtest.form.fundingSchedule.frequency.weekly') }}</a-select-option>
              <a-select-option value="monthly">{{ t('backtest.form.fundingSchedule.frequency.monthly') }}</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item :label="t('backtest.form.fundingSchedule.amount.label')" style="flex: 1; min-width: 150px;">
            <a-input-number
              v-model:value="formState.fundingSchedule.amount"
              :min="0"
              :max="1000000"
              :step="100"
              :formatter="(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
              :parser="(value) => value.replace(/\$\s?|(,*)/g, '')"
              style="width: 100%"
            />
          </a-form-item>
        </div>
      </a-form-item>

      <!-- Date Range Section -->
      <a-form-item required>
        <template #label>
          <span>
            {{ t('backtest.form.dateRange.label') }}
            <a-tooltip :title="t('backtest.form.dateRange.tooltip')">
              <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
            </a-tooltip>
          </span>
        </template>
        <template #extra>
          <span class="helper-text">{{ t('backtest.form.dateRange.helper') }}</span>
        </template>

        <!-- Preset Options -->
        <div class="preset-buttons">
          <a-button
            v-for="preset in datePresets.filter((p) => p.key !== 'custom')"
            :key="preset.key"
            :type="isDatePresetActive(preset) ? 'primary' : 'default'"
            size="small"
            @click="applyDatePreset(preset)"
          >
            {{ t(`backtest.form.dateRange.presets.${preset.key}`) }}
          </a-button>
        </div>

        <!-- Date Range Slider -->
        <DateRangeSlider
          :initial-start-date="formState.startDate"
          :initial-end-date="formState.endDate"
          @change="handleDateRangeChange"
        />
      </a-form-item>

      <!-- Timeframe Selection -->
      <a-form-item required>
        <template #label>
          <span>
            {{ t('backtest.form.timeframe.label') }}
            <a-tooltip :title="t('backtest.form.timeframe.tooltip')">
              <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
            </a-tooltip>
          </span>
        </template>
        <template #extra>
          <span class="helper-text">{{ t('backtest.form.timeframe.helper') }}</span>
        </template>
        <TimeframeSelection v-model="formState.timeframe" />
      </a-form-item>

      <!-- Mode Selection -->
      <a-form-item required>
        <template #label>
          <span>
            {{ t('backtest.mode.label') }}
            <a-tooltip :title="t('backtest.form.mode.tooltip')">
              <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
            </a-tooltip>
          </span>
        </template>
        <template #extra>
          <span class="helper-text">{{ t('backtest.form.mode.helper') }}</span>
        </template>
        <ModeSelection v-model="formState.mode" />
      </a-form-item>

      <!-- Strategy Selection (Compare Strategies Mode) -->
      <a-form-item
        v-if="formState.mode === 'compare-strategies'"
        required
      >
        <template #label>
          <span>
            {{ t('backtest.selectStrategies') }}
            <a-tooltip :title="t('backtest.form.strategySelection.tooltip')">
              <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
            </a-tooltip>
          </span>
        </template>
        <template #extra>
          <span class="helper-text">{{ t('backtest.form.strategySelection.helper') }}</span>
        </template>
        <StrategySelection v-model="formState.selectedStrategyIds" />
      </a-form-item>

      <!-- Parameter Variant Selection (Compare Variants Mode) -->
      <a-form-item
        v-if="formState.mode === 'compare-variants'"
        :label="t('backtest.variantMode.label')"
        required
      >
        <template #extra>
          <span class="helper-text">{{ t('backtest.form.strategySelection.helper') }}</span>
        </template>
        <ParameterVariantSelection
          :model-value="formState.selectedVariants"
          @update:model-value="(value: Variant[]) => (formState.selectedVariants = value)"
        />
      </a-form-item>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import DateRangeSlider from './DateRangeSlider.vue'
import TimeframeSelection from './TimeframeSelection.vue'
import ModeSelection from './ModeSelection.vue'
import StrategySelection from './StrategySelection.vue'
import ParameterVariantSelection from './ParameterVariantSelection.vue'
import type { FormState } from '../composables/useBacktestForm'
import type { Variant } from '@/shared/types/backtest'
import dayjs from 'dayjs'

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

// Quick select amounts
const quickSelectAmounts = [1000, 5000, 10000, 25000, 50000, 100000]

// Date presets
const datePresets = [
  {
    key: 'last1Year',
    getStartDate: () => dayjs().subtract(1, 'year').startOf('month'),
    getEndDate: () => dayjs().startOf('month'),
  },
  {
    key: 'last3Years',
    getStartDate: () => dayjs().subtract(3, 'year').startOf('month'),
    getEndDate: () => dayjs().startOf('month'),
  },
  {
    key: 'last5Years',
    getStartDate: () => dayjs().subtract(5, 'year').startOf('month'),
    getEndDate: () => dayjs().startOf('month'),
  },
  {
    key: 'custom',
    getStartDate: () => dayjs('2020-01-01').startOf('month'),
    getEndDate: () => dayjs().startOf('month'),
  },
]

function isDatePresetActive(preset: (typeof datePresets)[0]): boolean {
  const startDate = preset.getStartDate()
  const endDate = preset.getEndDate()
  const formStart = dayjs(props.formState.startDate).startOf('month')
  const formEnd = dayjs(props.formState.endDate).startOf('month')

  return formStart.isSame(startDate, 'month') && formEnd.isSame(endDate, 'month')
}

function applyDatePreset(preset: (typeof datePresets)[0]) {
  const startDate = preset.getStartDate()
  const endDate = preset.getEndDate()

  emit('date-range-change', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  })
  emit('apply-date-preset', preset)
}

function handleDateRangeChange(dates: { startDate: string; endDate: string }) {
  emit('date-range-change', dates)
}
</script>

<style scoped>
.helper-text {
  font-size: 12px;
  color: #666;
  font-weight: normal;
}

.quick-select-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.quick-select-buttons .ant-btn {
  border-radius: 4px;
  font-weight: 500;
  font-size: 12px;
  height: 28px;
  padding: 0 12px;
}

.investment-input {
  margin-top: 4px;
}

.portfolio-info-card {
  background: #fafafa;
  border: 1px solid #e8e8e8;
}

.portfolio-info-card :deep(.ant-card-body) {
  padding: 16px;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.preset-buttons .ant-btn {
  border-radius: 4px;
  font-weight: 500;
  font-size: 12px;
  height: 28px;
  padding: 0 12px;
}
</style>

