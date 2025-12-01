<template>
  <div class="home-view">
    <!-- Hero Section -->
    <HeroSection />

    <!-- How It Works Section -->
    <HowItWorks />

    <!-- Trust Indicators Section -->
    <TrustIndicators />

    <!-- Main Form Section -->
    <div id="strategy-form-section" class="form-section">
      <div class="container">
        <a-card class="form-card">
          <template #title>
            <h2>{{ t('backtest.title') }}</h2>
          </template>

          <a-form :model="formState" layout="vertical" @submit.prevent="handleCompare">
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
                <a-button type="link" size="small" @click="showAdvancedPortfolioModal = true">
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
                  <a-button type="link" size="small" @click="showAdvancedPortfolioModal = true">
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

            <!-- Error Message -->
            <a-alert
              v-if="backtestStore.error"
              :message="backtestStore.error"
              type="error"
              show-icon
              closable
              @close="backtestStore.error = null"
              style="margin-bottom: 24px"
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
                class="submit-button"
              >
                <template #icon>
                  <BarChartOutlined />
                </template>
                {{ t('backtest.compareStrategies') }}
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </div>
    </div>

    <!-- Disclaimer Section -->
    <DisclaimerSection />

    <!-- Advanced Portfolio Setup Modal -->
    <AdvancedPortfolioSetup
      v-model:visible="showAdvancedPortfolioModal"
      :initial-portfolio="formState.initialPortfolio"
      @update:initial-portfolio="(portfolio) => (formState.initialPortfolio = portfolio)"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { BarChartOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'
import { useBacktestStore } from '../stores/backtestStore'
import { useBacktestForm } from '../composables/useBacktestForm'
import HeroSection from '../components/HeroSection.vue'
import HowItWorks from '../components/HowItWorks.vue'
import TrustIndicators from '../components/TrustIndicators.vue'
import DisclaimerSection from '../components/DisclaimerSection.vue'
import DateRangeSlider from '../components/DateRangeSlider.vue'
import StrategySelection from '../components/StrategySelection.vue'
import ModeSelection from '../components/ModeSelection.vue'
import TimeframeSelection from '../components/TimeframeSelection.vue'
import ParameterVariantSelection from '../components/ParameterVariantSelection.vue'
import AdvancedPortfolioSetup from '../components/AdvancedPortfolioSetup.vue'
import type { Variant } from '@/shared/types/backtest'
import { ref } from 'vue'
import dayjs from 'dayjs'

const { t } = useI18n()
const backtestStore = useBacktestStore()
const { formState, handleDateRangeChange, handleCompare } = useBacktestForm()

// Advanced Portfolio Setup Modal
const showAdvancedPortfolioModal = ref(false)

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
  const formStart = dayjs(formState.startDate).startOf('month')
  const formEnd = dayjs(formState.endDate).startOf('month')

  return formStart.isSame(startDate, 'month') && formEnd.isSame(endDate, 'month')
}

function applyDatePreset(preset: (typeof datePresets)[0]) {
  const startDate = preset.getStartDate()
  const endDate = preset.getEndDate()

  handleDateRangeChange({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  })
}
</script>

<style scoped>
.home-view {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.form-section {
  padding: 40px 0;
  background-color: white;
}

.form-card {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
}

.form-card :deep(.ant-card-head) {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.form-card :deep(.ant-card-head-title) {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}

.form-card :deep(.ant-card-body) {
  padding: 24px;
}

.form-section-item {
  margin-bottom: 20px;
}

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

.submit-button {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  margin-top: 16px;
}

/* Compact form items */
.form-card :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.form-card :deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

.form-card :deep(.ant-form-item-label > label) {
  font-size: 14px;
  font-weight: 500;
  height: auto;
}

@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }

  .form-section {
    padding: 24px 0;
  }

  .form-card :deep(.ant-card-head) {
    padding: 16px;
  }

  .form-card :deep(.ant-card-head-title) {
    font-size: 20px;
  }

  .form-card :deep(.ant-card-body) {
    padding: 16px;
  }

  .form-card :deep(.ant-form-item) {
    margin-bottom: 16px;
  }

  .quick-select-buttons,
  .preset-buttons {
    gap: 4px;
  }

  .quick-select-buttons .ant-btn,
  .preset-buttons .ant-btn {
    font-size: 11px;
    height: 26px;
    padding: 0 8px;
  }

  .submit-button {
    height: 44px;
    font-size: 15px;
  }
}
</style>
