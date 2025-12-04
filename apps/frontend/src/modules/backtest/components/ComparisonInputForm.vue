<template>
  <div class="comparison-input-form">
    <!-- 1. Periodic Funding Amount + Frequency (same line on desktop, 2 lines on mobile) -->
    <div class="mb-6">
      <label class="block text-sm font-bold text-gray-900 mb-2 md:mb-3">
        Periodic funding:
        <span class="text-xs font-normal text-gray-500 ml-2">(for recurring investments)</span>
      </label>
      <div class="flex flex-col md:flex-row gap-3 md:gap-4">
        <!-- Amount Input -->
        <div class="flex-1">
          <a-input-number
            v-model:value="formState.fundingSchedule.amount"
            :min="0"
            :max="10000000"
            :step="10"
            :formatter="(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
            :parser="(value) => value.replace(/\$\s?|(,*)/g, '')"
            style="width: 100%"
            size="large"
            placeholder="100"
          />
        </div>
        <!-- Frequency Select -->
        <div class="w-full md:w-48">
          <a-select v-model:value="formState.fundingSchedule.frequency" class="w-full" size="large">
            <a-select-option value="daily">{{
              t('backtest.form.fundingSchedule.frequency.daily')
            }}</a-select-option>
            <a-select-option value="weekly">{{
              t('backtest.form.fundingSchedule.frequency.weekly')
            }}</a-select-option>
            <a-select-option value="monthly">{{
              t('backtest.form.fundingSchedule.frequency.monthly')
            }}</a-select-option>
          </a-select>
        </div>
      </div>
    </div>

    <!-- 2. Time Period -->
    <div class="mb-6">
      <label class="block text-sm font-bold text-gray-900 mb-2">
        Time period:
        <span class="text-xs font-normal text-gray-500 ml-2">
          {{ formatDateRangeShort(formState.startDate, formState.endDate) }}
        </span>
      </label>
      <DateRangeSlider
        :initial-start-date="formState.startDate"
        :initial-end-date="formState.endDate"
        @change="handleDateRangeChange"
      />
    </div>

    <!-- 3. Strategies Selection -->
    <div class="mb-6">
      <label class="block text-sm font-bold text-gray-900 mb-2 md:mb-3">
        Select strategies to compare:
      </label>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="strategy in availableStrategies"
          :key="strategy.key"
          :class="[
            'strategy-card relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200',
            isStrategySelected(strategy.key)
              ? 'border-indigo-500 bg-indigo-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm',
          ]"
          @click="() => handleStrategyToggle(strategy.key, !isStrategySelected(strategy.key))"
        >
          <!-- Question mark in top right -->
          <div class="absolute top-2 right-2">
            <a-tooltip :title="strategy.description">
              <QuestionCircleOutlined class="text-gray-400 hover:text-gray-600 cursor-help" />
            </a-tooltip>
          </div>

          <!-- Strategy Name -->
          <h3 class="text-sm font-bold text-gray-900 leading-tight pr-6 mb-2 truncate">
            {{ strategy.displayName }}
          </h3>

          <!-- Config Params Button (below strategy name) -->
          <a-button
            v-if="strategyHasParameters(strategy.id)"
            type="link"
            size="small"
            :disabled="!isStrategySelected(strategy.key)"
            class="p-0 h-auto text-xs"
            @click.stop="openParameterModal(strategy)"
          >
            <template #icon>
              <SettingOutlined />
            </template>
            Customize
          </a-button>
        </div>
      </div>

      <!-- CTA to add more strategies -->
      <div class="mt-4 text-center">
        <a-button
          type="link"
          @click="showAdvancedOptions = true"
          class="text-indigo-600 hover:text-indigo-700"
        >
          <template #icon>
            <PlusOutlined />
          </template>
          Add more strategies
        </a-button>
      </div>
    </div>

    <!-- Advanced Options Section -->
    <div class="mb-6 border-t pt-4">
      <div class="flex flex-col gap-2">
        <a-button
          type="link"
          class="text-left p-0 h-auto text-gray-600 hover:text-indigo-600"
          @click="showTimeframeModal = true"
        >
          <template #icon>
            <ClockCircleOutlined />
          </template>
          Configure candlestick timeframe
        </a-button>
        <a-button
          type="link"
          class="text-left p-0 h-auto text-gray-600 hover:text-indigo-600"
          @click="emit('update:show-advanced-portfolio-modal', true)"
        >
          <template #icon>
            <WalletOutlined />
          </template>
          Configure initial portfolio
        </a-button>
      </div>
    </div>

    <!-- Parameter Customization Modal -->
    <a-modal
      v-model:open="parameterModalVisible"
      :title="
        selectedStrategyForParams
          ? t('backtest.parameterModal.title', {
              strategy: t(`backtest.strategies.${selectedStrategyForParams.id}`),
            })
          : ''
      "
      :footer="null"
      width="600px"
      @cancel="closeParameterModal"
    >
      <div v-if="selectedStrategyForParams" class="parameter-form">
        <a-form :model="parameterForm" layout="vertical">
          <template v-if="selectedStrategyForParams.id === 'dca'">
            <a-form-item :help="t('backtest.parameters.dca.frequencyHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.dca.frequency') }}
                  <a-tooltip :title="t('backtest.parameters.dca.frequencyTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-select v-model:value="parameterForm.frequency" style="width: 100%">
                <a-select-option value="daily">{{ t('backtest.parameters.dca.frequencyOptions.daily') }}</a-select-option>
                <a-select-option value="weekly">{{ t('backtest.parameters.dca.frequencyOptions.weekly') }}</a-select-option>
                <a-select-option value="monthly">{{ t('backtest.parameters.dca.frequencyOptions.monthly') }}</a-select-option>
              </a-select>
            </a-form-item>
          </template>

          <template v-else-if="selectedStrategyForParams.id === 'rsi-dca'">
            <a-form-item :help="t('backtest.parameters.rsi.rsiPeriodHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.rsi.rsiPeriod') }}
                  <a-tooltip :title="t('backtest.parameters.rsi.rsiPeriodTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.rsiPeriod"
                :min="2"
                :max="50"
                :step="1"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.rsi.oversoldThresholdHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.rsi.oversoldThreshold') }}
                  <a-tooltip :title="t('backtest.parameters.rsi.oversoldThresholdTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.oversoldThreshold"
                :min="0"
                :max="50"
                :step="1"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.rsi.overboughtThresholdHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.rsi.overboughtThreshold') }}
                  <a-tooltip :title="t('backtest.parameters.rsi.overboughtThresholdTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.overboughtThreshold"
                :min="50"
                :max="100"
                :step="1"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.rsi.buyMultiplierHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.rsi.buyMultiplier') }}
                  <a-tooltip :title="t('backtest.parameters.rsi.buyMultiplierTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.buyMultiplier"
                :min="0.1"
                :max="10"
                :step="0.1"
                style="width: 100%"
              />
            </a-form-item>
          </template>

          <template v-else-if="selectedStrategyForParams.id === 'dip-buyer-dca'">
            <a-form-item :help="t('backtest.parameters.dip.lookbackDaysHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.dip.lookbackDays') }}
                  <a-tooltip :title="t('backtest.parameters.dip.lookbackDaysTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.lookbackDays"
                :min="1"
                :max="365"
                :step="1"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.dip.dropThresholdHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.dip.dropThreshold') }}
                  <a-tooltip :title="t('backtest.parameters.dip.dropThresholdTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.dropThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                :formatter="(value) => `${(value * 100).toFixed(0)}%`"
                :parser="(value) => parseFloat(value.replace('%', '')) / 100"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.dip.buyMultiplierHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.dip.buyMultiplier') }}
                  <a-tooltip :title="t('backtest.parameters.dip.buyMultiplierTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.buyMultiplier"
                :min="0.1"
                :max="10"
                :step="0.1"
                style="width: 100%"
              />
            </a-form-item>
          </template>

          <template v-else-if="selectedStrategyForParams.id === 'moving-average-dca'">
            <a-form-item :help="t('backtest.parameters.ma.maPeriodHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.ma.maPeriod') }}
                  <a-tooltip :title="t('backtest.parameters.ma.maPeriodTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.maPeriod"
                :min="2"
                :max="500"
                :step="1"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.ma.buyMultiplierHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.ma.buyMultiplier') }}
                  <a-tooltip :title="t('backtest.parameters.ma.buyMultiplierTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.buyMultiplier"
                :min="0.1"
                :max="10"
                :step="0.1"
                style="width: 100%"
              />
            </a-form-item>
          </template>

          <template v-else-if="selectedStrategyForParams.id === 'combined-smart-dca'">
            <a-form-item :help="t('backtest.parameters.combined.rsiPeriodHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.combined.rsiPeriod') }}
                  <a-tooltip :title="t('backtest.parameters.combined.rsiPeriodTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.rsiPeriod"
                :min="2"
                :max="50"
                :step="1"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.combined.oversoldThresholdHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.combined.oversoldThreshold') }}
                  <a-tooltip :title="t('backtest.parameters.combined.oversoldThresholdTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.oversoldThreshold"
                :min="0"
                :max="50"
                :step="1"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.combined.maPeriodHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.combined.maPeriod') }}
                  <a-tooltip :title="t('backtest.parameters.combined.maPeriodTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.maPeriod"
                :min="2"
                :max="500"
                :step="1"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.combined.lookbackDaysHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.combined.lookbackDays') }}
                  <a-tooltip :title="t('backtest.parameters.combined.lookbackDaysTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.lookbackDays"
                :min="1"
                :max="365"
                :step="1"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.combined.dropThresholdHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.combined.dropThreshold') }}
                  <a-tooltip :title="t('backtest.parameters.combined.dropThresholdTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.dropThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                :formatter="(value) => `${(value * 100).toFixed(0)}%`"
                :parser="(value) => parseFloat(value.replace('%', '')) / 100"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.combined.maxMultiplierHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.combined.maxMultiplier') }}
                  <a-tooltip :title="t('backtest.parameters.combined.maxMultiplierTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.maxMultiplier"
                :min="0.1"
                :max="10"
                :step="0.1"
                style="width: 100%"
              />
            </a-form-item>
          </template>

          <template v-else-if="selectedStrategyForParams.id === 'rebalancing'">
            <a-form-item :help="t('backtest.parameters.rebalancing.targetAllocationHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.rebalancing.targetAllocation') }}
                  <a-tooltip :title="t('backtest.parameters.rebalancing.targetAllocationTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.targetAllocation"
                :min="0"
                :max="1"
                :step="0.01"
                :formatter="(value) => `${(value * 100).toFixed(0)}%`"
                :parser="(value) => parseFloat(value.replace('%', '')) / 100"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.rebalancing.rebalanceThresholdHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.rebalancing.rebalanceThreshold') }}
                  <a-tooltip :title="t('backtest.parameters.rebalancing.rebalanceThresholdTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.rebalanceThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                :formatter="(value) => `${(value * 100).toFixed(0)}%`"
                :parser="(value) => parseFloat(value.replace('%', '')) / 100"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.rebalancing.rebalanceScheduleHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.rebalancing.rebalanceSchedule') }}
                  <a-tooltip :title="t('backtest.parameters.rebalancing.rebalanceScheduleTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-select v-model:value="parameterForm.rebalanceSchedule" style="width: 100%">
                <a-select-option value="none">{{ t('backtest.parameters.rebalancing.scheduleOptions.none') }}</a-select-option>
                <a-select-option value="weekly">{{ t('backtest.parameters.rebalancing.scheduleOptions.weekly') }}</a-select-option>
                <a-select-option value="monthly">{{ t('backtest.parameters.rebalancing.scheduleOptions.monthly') }}</a-select-option>
                <a-select-option value="quarterly">{{ t('backtest.parameters.rebalancing.scheduleOptions.quarterly') }}</a-select-option>
              </a-select>
            </a-form-item>
          </template>

          <a-form-item v-if="selectedStrategyForParams && strategyHasParameters(selectedStrategyForParams.id)">
            <a-space>
              <a-button type="primary" @click="saveParameters">{{ t('common.save') }}</a-button>
              <a-button @click="resetParameters">{{ t('backtest.parameterModal.resetToDefaults') }}</a-button>
              <a-button @click="closeParameterModal">{{ t('common.cancel') }}</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- Timeframe Modal -->
    <a-modal
      v-model:open="showTimeframeModal"
      title="Configure Candlestick Timeframe"
      :footer="null"
      width="500px"
    >
      <div class="mb-4">
        <label class="block text-sm font-bold text-gray-900 mb-2">
          {{ t('backtest.form.timeframe.label') }}
        </label>
        <TimeframeSelection v-model="formState.timeframe" />
      </div>
    </a-modal>

    <!-- Advanced Options Modal (for adding more strategies) -->
    <a-modal
      v-model:open="showAdvancedOptions"
      title="Add More Strategies"
      :footer="null"
      width="800px"
    >
      <StrategySelection
        v-model="formState.selectedStrategyIds"
        @update:model-value="(value) => (formState.selectedStrategyIds = value)"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  QuestionCircleOutlined,
  PlusOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  WalletOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import DateRangeSlider from './DateRangeSlider.vue'
import StrategySelection from './StrategySelection.vue'
import TimeframeSelection from './TimeframeSelection.vue'
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

const showAdvancedOptions = ref(false)
const showTimeframeModal = ref(false)
const parameterModalVisible = ref(false)
const selectedStrategyForParams = ref<{ id: string; key: string } | null>(null)
const parameterForm = reactive<Record<string, any>>({})

// Strategy info with parameter support
const strategyInfo: Record<
  string,
  { hasParameters: boolean; defaultParameters?: Record<string, any> }
> = {
  'lump-sum': { hasParameters: false },
  dca: { hasParameters: true, defaultParameters: { frequency: 'weekly' } },
  'rsi-dca': {
    hasParameters: true,
    defaultParameters: {
      rsiPeriod: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
      buyMultiplier: 2.0,
    },
  },
  'dip-buyer-dca': {
    hasParameters: true,
    defaultParameters: { lookbackDays: 30, dropThreshold: 0.1, buyMultiplier: 2.0 },
  },
  'moving-average-dca': {
    hasParameters: true,
    defaultParameters: { maPeriod: 50, buyMultiplier: 2.0 },
  },
  'combined-smart-dca': {
    hasParameters: true,
    defaultParameters: {
      rsiPeriod: 14,
      oversoldThreshold: 30,
      maPeriod: 50,
      lookbackDays: 30,
      dropThreshold: 0.1,
      maxMultiplier: 3.0,
    },
  },
  rebalancing: {
    hasParameters: true,
    defaultParameters: {
      targetAllocation: 0.8,
      rebalanceThreshold: 0.1,
      rebalanceSchedule: 'none',
    },
  },
}

// Available strategies (simplified for quick selection)
const availableStrategies = [
  {
    key: 'lump-sum',
    id: 'lump-sum',
    displayName: t('backtest.strategies.lump-sum'),
    description: t('backtest.strategyDescriptions.lump-sum'),
    params: undefined,
  },
  {
    key: 'dca',
    id: 'dca',
    displayName: t('backtest.strategies.dca'),
    description: t('backtest.strategyDescriptions.dca'),
    params: undefined,
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
  {
    key: 'rebalancing',
    id: 'rebalancing',
    displayName: t('backtest.strategies.rebalancing'),
    description: t('backtest.strategyDescriptions.rebalancing'),
    params: undefined,
  },
]


// Check if strategy is selected
const isStrategySelected = (key: string) => {
  return props.formState.selectedStrategyIds.some((s) => {
    const strategy = availableStrategies.find((as) => as.key === key)
    if (!strategy) return false
    return (
      s.strategyId === strategy.id &&
      JSON.stringify(s.parameters || {}) === JSON.stringify(strategy.params || {})
    )
  })
}

// Handle strategy toggle
const handleStrategyToggle = (key: string, checked: boolean) => {
  const strategy = availableStrategies.find((s) => s.key === key)
  if (!strategy) return

  if (checked) {
    const strategyConfig: { strategyId: string; parameters?: Record<string, any> } = {
      strategyId: strategy.id,
    }
    if (strategy.params && Object.keys(strategy.params).length > 0) {
      strategyConfig.parameters = strategy.params
    }
    props.formState.selectedStrategyIds.push(strategyConfig)
  } else {
    props.formState.selectedStrategyIds = props.formState.selectedStrategyIds.filter((s) => {
      return !(
        s.strategyId === strategy.id &&
        JSON.stringify(s.parameters || {}) === JSON.stringify(strategy.params || {})
      )
    })
  }
}

function handleDateRangeChange(dates: { startDate: string; endDate: string }) {
  emit('date-range-change', dates)
}

// Format date range for short display
function formatDateRangeShort(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return ''
  const start = dayjs(startDate)
  const end = dayjs(endDate)
  return `${start.format('MMM YYYY')} - ${end.format('MMM YYYY')}`
}

// Check if strategy has parameters
function strategyHasParameters(strategyId: string): boolean {
  return strategyInfo[strategyId]?.hasParameters || false
}


// Open parameter modal
function openParameterModal(strategy: { id: string; key: string }) {
  selectedStrategyForParams.value = strategy
  const currentStrategy = props.formState.selectedStrategyIds.find((s) => s.strategyId === strategy.id)
  if (currentStrategy?.parameters) {
    Object.assign(parameterForm, currentStrategy.parameters)
  } else if (strategyInfo[strategy.id]?.defaultParameters) {
    Object.assign(parameterForm, strategyInfo[strategy.id].defaultParameters!)
  }
  parameterModalVisible.value = true
}

// Close parameter modal
function closeParameterModal() {
  parameterModalVisible.value = false
  selectedStrategyForParams.value = null
  Object.keys(parameterForm).forEach((key) => delete parameterForm[key])
}

// Save parameters
function saveParameters() {
  if (!selectedStrategyForParams.value) return

  const index = props.formState.selectedStrategyIds.findIndex(
    (s) => s.strategyId === selectedStrategyForParams.value!.id,
  )

  if (index >= 0) {
    const cleanedParams: Record<string, any> = {}
    Object.keys(parameterForm).forEach((key) => {
      if (parameterForm[key] !== undefined && parameterForm[key] !== null) {
        cleanedParams[key] = parameterForm[key]
      }
    })

    props.formState.selectedStrategyIds[index] = {
      strategyId: selectedStrategyForParams.value.id,
      parameters: Object.keys(cleanedParams).length > 0 ? cleanedParams : undefined,
    }
  }

  closeParameterModal()
}

// Reset parameters to defaults
function resetParameters() {
  if (!selectedStrategyForParams.value?.id || !strategyInfo[selectedStrategyForParams.value.id]?.defaultParameters)
    return
  Object.assign(parameterForm, strategyInfo[selectedStrategyForParams.value.id].defaultParameters!)
}

// Watch formState to sync selectedStrategyIds and ensure mode is compare-strategies
watch(
  () => props.formState.selectedStrategyIds,
  () => {
    // Ensure mode is set to compare-strategies
    props.formState.mode = 'compare-strategies'
  },
  { deep: true },
)
</script>

<style scoped>
.strategy-card {
  min-height: 60px;
}
</style>
