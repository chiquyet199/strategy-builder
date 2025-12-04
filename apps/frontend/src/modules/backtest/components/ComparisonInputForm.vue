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
      
      <!-- Base strategy cards (for adding new strategies) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <a-tooltip
          v-for="strategy in availableStrategies"
          :key="`base-${strategy.key}`"
          :title="strategy.description"
        >
          <div
            :class="[
              'strategy-card relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200',
              'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm',
              'flex items-center justify-center min-h-[60px]',
            ]"
            @click="() => handleAddBaseStrategy(strategy)"
          >
            <!-- Add Button -->
            <div class="text-sm font-semibold text-indigo-600">
              Add {{ strategy.displayName }}
            </div>
          </div>
        </a-tooltip>

        <!-- Add Custom Strategy Card -->
        <div
          :class="[
            'strategy-card relative p-3 rounded-lg border-2 transition-all duration-200',
            'border-gray-200 bg-gray-50 border-dashed',
            'flex items-center justify-center min-h-[60px]',
            'opacity-50 cursor-not-allowed',
          ]"
        >
          <!-- Add Custom Button -->
          <div class="text-sm font-semibold text-gray-400">
            Add Custom
          </div>
        </div>
      </div>

      <!-- Selected strategy variants (each as separate card, 1 per row) -->
      <div class="space-y-3">
        <div
          v-for="(variant, index) in selectedVariantsList"
          :key="`variant-${index}-${generateVariantKey(variant)}`"
          :class="[
            'strategy-card relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200',
            'border-indigo-500 bg-indigo-50 shadow-md',
          ]"
          @click="() => handleVariantClick(variant, index)"
        >
          <!-- Close button in top right -->
          <div class="absolute top-2 right-2">
            <a-button
              type="text"
              size="small"
              class="p-0 h-auto text-gray-400 hover:text-red-500"
              @click.stop="removeStrategyVariant(index)"
            >
              <template #icon>
                <CloseOutlined />
              </template>
            </a-button>
          </div>

          <!-- Strategy Name -->
          <div class="flex items-center gap-2 pr-6 mb-1">
            <h3 class="text-sm font-bold text-gray-900 leading-tight truncate flex-1">
              {{ ('variantName' in variant && variant.variantName) || getVariantDisplayName(variant, index) }}
            </h3>
          </div>

          <!-- Parameter Info -->
          <div v-if="variant.parameters && Object.keys(variant.parameters).length > 0" class="text-xs text-gray-600 mb-2">
            {{ getVariantParamsSummary(variant) }}
          </div>

          <!-- Config Params Button -->
          <a-button
            v-if="strategyHasParameters(variant.strategyId)"
            type="link"
            size="small"
            class="p-0 h-auto text-xs"
            @click.stop="openVariantParameterModalForEdit(variant, index)"
          >
            <template #icon>
              <SettingOutlined />
            </template>
            Edit
          </a-button>
        </div>
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
      :z-index="1001"
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
            <a-form-item :help="t('backtest.parameters.dip.buyPercentageHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.dip.buyPercentage') }}
                  <a-tooltip :title="t('backtest.parameters.dip.buyPercentageTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="parameterForm.buyPercentage"
                :min="0"
                :max="1"
                :step="0.05"
                :formatter="(value) => `${(value * 100).toFixed(0)}%`"
                :parser="(value) => parseFloat(value.replace('%', '')) / 100"
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
                <a-select-option value="none">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.none') }}</a-select-option>
                <a-select-option value="weekly">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.weekly') }}</a-select-option>
                <a-select-option value="monthly">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.monthly') }}</a-select-option>
                <a-select-option value="quarterly">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.quarterly') }}</a-select-option>
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

    <!-- Add New Strategy Modal (supports adding new strategies or variants with different params) -->
    <a-modal
      v-model:open="showAddVariantModal"
      title="Add New Strategy"
      :footer="null"
      width="600px"
      :z-index="1000"
    >
      <div class="space-y-4">
        <div class="text-sm text-gray-600 mb-4">
          Select a strategy to add. You can add a new strategy or create a variant of an already selected strategy with different parameters.
        </div>
        
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Select strategy:
          </label>
          <a-select
            v-model:value="selectedStrategyForVariant"
            placeholder="Choose a strategy"
            class="w-full"
            size="large"
          >
            <a-select-option
              v-for="strategy in availableStrategies"
              :key="strategy.key"
              :value="strategy.id"
            >
              <div class="flex items-center justify-between">
                <span>{{ strategy.displayName }}</span>
                <span
                  v-if="isStrategySelected(strategy.key)"
                  class="text-xs text-indigo-600 ml-2"
                >
                  (already selected)
                </span>
              </div>
            </a-select-option>
          </a-select>
        </div>

        <div v-if="selectedStrategyForVariant && strategyHasParameters(selectedStrategyForVariant)">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Configure parameters:
          </label>
          <div class="space-y-2">
            <a-button type="default" @click="openVariantParameterModal" class="w-full">
              <template #icon>
                <SettingOutlined />
              </template>
              Configure Parameters
            </a-button>
            <div v-if="Object.keys(variantParameterForm).length > 0" class="text-xs text-gray-500">
              Parameters configured. Click "Configure Parameters" to modify.
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t">
          <a-button @click="showAddVariantModal = false">Cancel</a-button>
          <a-button
            type="primary"
            :disabled="!selectedStrategyForVariant"
            @click="addStrategyVariant"
          >
            Add Strategy
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Variant Parameter Modal -->
    <a-modal
      v-model:open="showVariantParameterModal"
      title="Configure Strategy Parameters"
      :footer="null"
      width="600px"
      :z-index="1001"
      @cancel="closeVariantParameterModal"
    >
      <div v-if="selectedStrategyForVariant" class="parameter-form">
        <!-- Duplicate Error Message -->
        <a-alert
          v-if="duplicateVariantError"
          type="warning"
          :message="duplicateVariantError"
          show-icon
          class="mb-4"
          closable
          @close="duplicateVariantError = null"
        />
        <a-form :model="variantParameterForm" layout="vertical" :class="{ 'error-highlight': duplicateVariantError }">
          <!-- Strategy Name Field -->
          <a-form-item label="Strategy Name">
            <a-input
              v-model:value="variantNameForm"
              placeholder="Enter custom name (optional)"
              :maxlength="50"
            />
            <template #help>
              Leave empty to use auto-generated name with index
            </template>
          </a-form-item>
          
          <!-- Same parameter forms as in the main parameter modal -->
          <template v-if="selectedStrategyForVariant === 'dca'">
            <a-form-item :help="t('backtest.parameters.dca.frequencyHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.dca.frequency') }}
                  <a-tooltip :title="t('backtest.parameters.dca.frequencyTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-select v-model:value="variantParameterForm.frequency" style="width: 100%">
                <a-select-option value="daily">{{ t('backtest.parameters.dca.frequencyOptions.daily') }}</a-select-option>
                <a-select-option value="weekly">{{ t('backtest.parameters.dca.frequencyOptions.weekly') }}</a-select-option>
                <a-select-option value="monthly">{{ t('backtest.parameters.dca.frequencyOptions.monthly') }}</a-select-option>
              </a-select>
            </a-form-item>
          </template>

          <!-- RSI DCA Parameters -->
          <template v-if="selectedStrategyForVariant === 'rsi-dca'">
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
                v-model:value="variantParameterForm.rsiPeriod"
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
                v-model:value="variantParameterForm.oversoldThreshold"
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
                v-model:value="variantParameterForm.overboughtThreshold"
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
                v-model:value="variantParameterForm.buyMultiplier"
                :min="0.1"
                :max="10"
                :step="0.1"
                style="width: 100%"
              />
            </a-form-item>
          </template>

          <!-- Dip Buyer DCA Parameters -->
          <template v-if="selectedStrategyForVariant === 'dip-buyer-dca'">
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
                v-model:value="variantParameterForm.lookbackDays"
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
                v-model:value="variantParameterForm.dropThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                :formatter="(value) => `${(value * 100).toFixed(0)}%`"
                :parser="(value) => parseFloat(value.replace('%', '')) / 100"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item :help="t('backtest.parameters.dip.buyPercentageHelp')">
              <template #label>
                <span>
                  {{ t('backtest.parameters.dip.buyPercentage') }}
                  <a-tooltip :title="t('backtest.parameters.dip.buyPercentageTooltip')">
                    <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="variantParameterForm.buyPercentage"
                :min="0"
                :max="1"
                :step="0.05"
                :formatter="(value) => `${(value * 100).toFixed(0)}%`"
                :parser="(value) => parseFloat(value.replace('%', '')) / 100"
                style="width: 100%"
              />
            </a-form-item>
          </template>

          <!-- Moving Average DCA Parameters -->
          <template v-if="selectedStrategyForVariant === 'moving-average-dca'">
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
                v-model:value="variantParameterForm.maPeriod"
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
                v-model:value="variantParameterForm.buyMultiplier"
                :min="0.1"
                :max="10"
                :step="0.1"
                style="width: 100%"
              />
            </a-form-item>
          </template>

          <!-- Combined Smart DCA Parameters -->
          <template v-if="selectedStrategyForVariant === 'combined-smart-dca'">
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
                v-model:value="variantParameterForm.rsiPeriod"
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
                v-model:value="variantParameterForm.oversoldThreshold"
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
                v-model:value="variantParameterForm.maPeriod"
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
                v-model:value="variantParameterForm.lookbackDays"
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
                v-model:value="variantParameterForm.dropThreshold"
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
                v-model:value="variantParameterForm.maxMultiplier"
                :min="0.1"
                :max="10"
                :step="0.1"
                style="width: 100%"
              />
            </a-form-item>
          </template>

          <!-- Rebalancing Parameters -->
          <template v-if="selectedStrategyForVariant === 'rebalancing'">
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
                v-model:value="variantParameterForm.targetAllocation"
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
                v-model:value="variantParameterForm.rebalanceThreshold"
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
              <a-select v-model:value="variantParameterForm.rebalanceSchedule" style="width: 100%">
                <a-select-option value="none">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.none') }}</a-select-option>
                <a-select-option value="weekly">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.weekly') }}</a-select-option>
                <a-select-option value="monthly">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.monthly') }}</a-select-option>
                <a-select-option value="quarterly">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.quarterly') }}</a-select-option>
              </a-select>
            </a-form-item>
          </template>

          <a-form-item v-if="selectedStrategyForVariant && strategyHasParameters(selectedStrategyForVariant)">
            <a-space>
              <a-button type="primary" @click="saveVariantParameters">{{ t('common.save') }}</a-button>
              <a-button @click="resetVariantParameters">{{ t('backtest.parameterModal.resetToDefaults') }}</a-button>
              <a-button @click="closeVariantParameterModal">{{ t('common.cancel') }}</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  QuestionCircleOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  WalletOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import DateRangeSlider from './DateRangeSlider.vue'
import TimeframeSelection from './TimeframeSelection.vue'
import type { FormState } from '../composables/useBacktestForm'
import {
  isSameStrategyConfig,
  findStrategyVariants,
} from '../../../shared/utils/strategy-identifier'
import type { StrategyConfig } from '../../../shared/types/backtest'

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

const showAddVariantModal = ref(false)
const showVariantParameterModal = ref(false)
const showTimeframeModal = ref(false)
const parameterModalVisible = ref(false)
const selectedStrategyForParams = ref<{ id: string; key: string } | null>(null)
const selectedStrategyForVariant = ref<string | null>(null)
const selectedVariantIndex = ref<number | null>(null)
const parameterForm = reactive<Record<string, any>>({})
const variantParameterForm = reactive<Record<string, any>>({})
const variantNameForm = ref<string>('')
const duplicateVariantError = ref<string | null>(null)

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
    defaultParameters: { lookbackDays: 30, dropThreshold: 0.1, buyPercentage: 0.5 },
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
  // Temporarily hidden for later release
  // {
  //   key: 'rsi-dca',
  //   id: 'rsi-dca',
  //   displayName: t('backtest.strategies.rsi-dca'),
  //   description: t('backtest.strategyDescriptions.rsi-dca'),
  //   params: undefined,
  // },
  // Temporarily hidden for later release
  // {
  //   key: 'dip-buyer-dca',
  //   id: 'dip-buyer-dca',
  //   displayName: t('backtest.strategies.dip-buyer-dca'),
  //   description: t('backtest.strategyDescriptions.dip-buyer-dca'),
  //   params: undefined,
  // },
  // Temporarily hidden for later release
  // {
  //   key: 'combined-smart-dca',
  //   id: 'combined-smart-dca',
  //   displayName: t('backtest.strategies.combined-smart-dca'),
  //   description: t('backtest.strategyDescriptions.combined-smart-dca'),
  //   params: undefined,
  // },
  {
    key: 'rebalancing',
    id: 'rebalancing',
    displayName: t('backtest.strategies.rebalancing'),
    description: t('backtest.strategyDescriptions.rebalancing'),
    params: undefined,
  },
]


// Generate unique key for a variant
const generateVariantKey = (config: StrategyConfig): string => {
  const paramsStr = JSON.stringify(config.parameters || {})
  return `${config.strategyId}_${paramsStr}`
}

// Check if variant has custom parameters (different from defaults)
const isCustomVariant = (config: StrategyConfig): boolean => {
  if (!config.parameters || Object.keys(config.parameters).length === 0) {
    return false
  }
  
  const defaultParams = strategyInfo[config.strategyId]?.defaultParameters
  if (!defaultParams) {
    return true // Has params but no defaults = custom
  }
  
  // Compare with defaults
  return JSON.stringify(config.parameters) !== JSON.stringify(defaultParams)
}

// Get short summary of variant parameters
const getVariantParamsSummary = (config: StrategyConfig): string => {
  if (!config.parameters || Object.keys(config.parameters).length === 0) {
    return 'Default parameters'
  }
  
  const parts: string[] = []
  
  // DCA
  if (config.parameters.frequency) {
    parts.push(`Frequency: ${config.parameters.frequency}`)
  }
  
  // Dip Buyer DCA
  if (config.parameters.buyPercentage !== undefined) {
    parts.push(`Buy: ${(config.parameters.buyPercentage * 100).toFixed(0)}%`)
  }
  if (config.parameters.dropThreshold !== undefined) {
    parts.push(`Drop: ${(config.parameters.dropThreshold * 100).toFixed(0)}%`)
  }
  if (config.parameters.lookbackDays) {
    parts.push(`Lookback: ${config.parameters.lookbackDays}d`)
  }
  
  // Moving Average DCA
  if (config.parameters.maPeriod) {
    parts.push(`MA: ${config.parameters.maPeriod}`)
  }
  if (config.parameters.buyMultiplier) {
    parts.push(`Multiplier: ${config.parameters.buyMultiplier}x`)
  }
  
  // RSI DCA
  if (config.parameters.rsiPeriod) {
    parts.push(`RSI: ${config.parameters.rsiPeriod}`)
  }
  if (config.parameters.oversoldThreshold) {
    parts.push(`Oversold: ${config.parameters.oversoldThreshold}`)
  }
  
  // Rebalancing
  if (config.parameters.targetAllocation !== undefined) {
    parts.push(`Target: ${(config.parameters.targetAllocation * 100).toFixed(0)}%`)
  }
  if (config.parameters.rebalanceThreshold !== undefined) {
    parts.push(`Threshold: ${(config.parameters.rebalanceThreshold * 100).toFixed(0)}%`)
  }
  if (config.parameters.rebalanceSchedule && config.parameters.rebalanceSchedule !== 'none') {
    const scheduleKey = `backtest.parameters.rebalancing.rebalanceScheduleOptions.${config.parameters.rebalanceSchedule}`
    const scheduleText = t(scheduleKey)
    parts.push(`Schedule: ${scheduleText}`)
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Custom parameters'
}

// Get display name for a variant
const getVariantDisplayName = (config: StrategyConfig, index?: number): string => {
  // If variantName is set, use it
  if ('variantName' in config && config.variantName && typeof config.variantName === 'string') {
    return config.variantName
  }
  
  const strategy = availableStrategies.find((s) => s.id === config.strategyId)
  const baseName = strategy?.displayName || config.strategyId
  
  // Auto-generate name with index for same strategy variants
  if (index !== undefined) {
    // Count how many variants of this strategy exist before this one
    const sameStrategyVariants = props.formState.selectedStrategyIds.filter(
      (s, idx) => s.strategyId === config.strategyId && idx <= index
    )
    const variantIndex = sameStrategyVariants.length
    
    // Only show index if there are multiple variants of the same strategy
    const totalVariants = props.formState.selectedStrategyIds.filter(
      (s) => s.strategyId === config.strategyId
    ).length
    
    if (totalVariants > 1) {
      return `${baseName} (${variantIndex})`
    }
  }
  
  return baseName
}

// Get list of all selected variants with their indices
const selectedVariantsList = computed(() => {
  return props.formState.selectedStrategyIds.map((config, index) => ({
    ...config,
    _index: index, // Store index for removal
    _displayName: getVariantDisplayName(config, index), // Pre-compute display name
  }))
})

// Check if strategy is selected (by strategyId only, regardless of parameters)
const isStrategySelected = (key: string) => {
  const strategy = availableStrategies.find((as) => as.key === key)
  if (!strategy) return false
  return props.formState.selectedStrategyIds.some((s) => s.strategyId === strategy.id)
}


// Handle adding a base strategy (from base strategy card)
const handleAddBaseStrategy = (strategy: { id: string; key: string; params?: Record<string, any> }) => {
  // Check if this strategy already exists (any variant)
  const strategyExists = props.formState.selectedStrategyIds.some(
    (s) => s.strategyId === strategy.id
  )
  
  if (strategyExists) {
    // If strategy already exists, directly open parameter config modal to create a variant
    selectedStrategyForVariant.value = strategy.id
    selectedVariantIndex.value = null // New variant, not editing existing
    
    // Set default name: Strategy Name + "customized"
    const strategyObj = availableStrategies.find((s) => s.id === strategy.id)
    const baseName = strategyObj?.displayName || strategy.id
    variantNameForm.value = `${baseName} customized`
    
    duplicateVariantError.value = null // Clear any previous errors
    
    // Load default parameters
    if (strategyInfo[strategy.id]?.defaultParameters) {
      Object.assign(variantParameterForm, strategyInfo[strategy.id].defaultParameters!)
    } else if (strategy.params && Object.keys(strategy.params).length > 0) {
      Object.assign(variantParameterForm, strategy.params)
    } else {
      // Clear form if no defaults
      Object.keys(variantParameterForm).forEach((key) => delete variantParameterForm[key])
    }
    
    // Open the parameter modal directly (skip the "Add New Strategy" modal)
    showVariantParameterModal.value = true
  } else {
    // First instance - add with default parameters
    const defaultConfig: StrategyConfig = {
      strategyId: strategy.id,
    }
    
    // Add default parameters if strategy has them
    if (strategy.params && Object.keys(strategy.params).length > 0) {
      defaultConfig.parameters = strategy.params
    } else if (strategyInfo[strategy.id]?.defaultParameters) {
      defaultConfig.parameters = { ...strategyInfo[strategy.id].defaultParameters! }
    }
    
    props.formState.selectedStrategyIds.push(defaultConfig)
  }
}

// Handle adding custom strategy (placeholder for now)
const handleAddCustomStrategy = () => {
  // TODO: Implement custom strategy builder
  // For now, just show a message or open a placeholder modal
  console.log('Custom strategy builder - coming soon')
  // You can add a modal or notification here
}

// Handle clicking on a variant card
const handleVariantClick = (variant: StrategyConfig, index: number) => {
  // Open edit modal for this variant
  openVariantParameterModalForEdit(variant, index)
}

// Open parameter modal for editing an existing variant
const openVariantParameterModalForEdit = (variant: StrategyConfig, index: number) => {
  selectedStrategyForVariant.value = variant.strategyId
  selectedVariantIndex.value = index
  
  // Load current name
  variantNameForm.value = ('variantName' in variant && variant.variantName && typeof variant.variantName === 'string') ? variant.variantName : ''
  
  // Load current parameters
  if (variant.parameters) {
    Object.assign(variantParameterForm, variant.parameters)
  } else if (strategyInfo[variant.strategyId]?.defaultParameters) {
    Object.assign(variantParameterForm, strategyInfo[variant.strategyId].defaultParameters!)
  }
  
  showVariantParameterModal.value = true
}

// Remove a specific variant by index
const removeStrategyVariant = (index: number) => {
  props.formState.selectedStrategyIds.splice(index, 1)
}

// Add a new strategy variant
const addStrategyVariant = () => {
  if (!selectedStrategyForVariant.value) return

  const strategy = availableStrategies.find((s) => s.id === selectedStrategyForVariant.value)
  if (!strategy) return

  const newConfig: StrategyConfig = {
    strategyId: selectedStrategyForVariant.value,
  }

  // Add parameters if configured
  if (Object.keys(variantParameterForm).length > 0) {
    const cleanedParams: Record<string, any> = {}
    Object.keys(variantParameterForm).forEach((key) => {
      if (variantParameterForm[key] !== undefined && variantParameterForm[key] !== null) {
        cleanedParams[key] = variantParameterForm[key]
      }
    })
    if (Object.keys(cleanedParams).length > 0) {
      newConfig.parameters = cleanedParams
    }
  } else if (strategy.params && Object.keys(strategy.params).length > 0) {
    newConfig.parameters = strategy.params
  }

  // Check if this exact variant already exists
  const existingIndex = props.formState.selectedStrategyIds.findIndex((s) =>
    isSameStrategyConfig(s, newConfig)
  )

  if (existingIndex >= 0) {
    // Duplicate found - show error message
    duplicateVariantError.value = 'This strategy with the same parameters is already selected. Please change the parameters to create a different variant.'
    return
  }

    // Clear error
    duplicateVariantError.value = null
    
    // Auto-generate variantName with index for duplicates
    const sameStrategyCount = props.formState.selectedStrategyIds.filter(
      (s) => s.strategyId === newConfig.strategyId
    ).length
    if (sameStrategyCount > 0) {
      const baseName = strategy.displayName || newConfig.strategyId
      ;(newConfig as any).variantName = `${baseName} (${sameStrategyCount + 1})`
    }

  props.formState.selectedStrategyIds.push(newConfig)

  // Reset and close modal
  selectedStrategyForVariant.value = null
  selectedVariantIndex.value = null
  Object.keys(variantParameterForm).forEach((key) => delete variantParameterForm[key])
  duplicateVariantError.value = null
  showAddVariantModal.value = false
}

// Open variant parameter modal
const openVariantParameterModal = () => {
  if (!selectedStrategyForVariant.value) return
  
  // Set default name: Strategy Name + "customized"
  const strategy = availableStrategies.find((s) => s.id === selectedStrategyForVariant.value)
  const baseName = strategy?.displayName || selectedStrategyForVariant.value
  variantNameForm.value = `${baseName} customized`
  
  if (strategy && strategyInfo[selectedStrategyForVariant.value]?.defaultParameters) {
    Object.assign(variantParameterForm, strategyInfo[selectedStrategyForVariant.value].defaultParameters!)
  }
  showVariantParameterModal.value = true
}

// Close variant parameter modal
const closeVariantParameterModal = () => {
  showVariantParameterModal.value = false
  selectedStrategyForVariant.value = null
  selectedVariantIndex.value = null
  duplicateVariantError.value = null
  Object.keys(variantParameterForm).forEach((key) => delete variantParameterForm[key])
}


// Save variant parameters
const saveVariantParameters = () => {
  if (!selectedStrategyForVariant.value) return
  
  const cleanedParams: Record<string, any> = {}
  Object.keys(variantParameterForm).forEach((key) => {
    if (variantParameterForm[key] !== undefined && variantParameterForm[key] !== null) {
      cleanedParams[key] = variantParameterForm[key]
    }
  })
  
  const updatedConfig: StrategyConfig = {
    strategyId: selectedStrategyForVariant.value,
    parameters: Object.keys(cleanedParams).length > 0 ? cleanedParams : undefined,
  }
  
  // Set variantName from form
  const trimmedName = variantNameForm.value.trim()
  if (trimmedName) {
    ;(updatedConfig as any).variantName = trimmedName
  } else {
    // If no custom name, auto-generate with index
    const sameStrategyCount = props.formState.selectedStrategyIds.filter(
      (s) => s.strategyId === updatedConfig.strategyId
    ).length
    if (selectedVariantIndex.value !== null && selectedVariantIndex.value >= 0) {
      // Editing existing - count existing variants of same strategy
      const existingVariants = props.formState.selectedStrategyIds.filter(
        (s, idx) => s.strategyId === updatedConfig.strategyId && idx <= selectedVariantIndex.value!
      )
      const variantIndex = existingVariants.length
      const strategy = availableStrategies.find((s) => s.id === updatedConfig.strategyId)
      const baseName = strategy?.displayName || updatedConfig.strategyId
      ;(updatedConfig as any).variantName = `${baseName} (${variantIndex})`
    } else if (sameStrategyCount > 0) {
      // Adding new - use count + 1
      const strategy = availableStrategies.find((s) => s.id === updatedConfig.strategyId)
      const baseName = strategy?.displayName || updatedConfig.strategyId
      ;(updatedConfig as any).variantName = `${baseName} (${sameStrategyCount + 1})`
    }
  }
  
  // If editing an existing variant, update it
  if (selectedVariantIndex.value !== null && selectedVariantIndex.value >= 0) {
    // Check if updated config already exists (different variant)
    const existingIndex = props.formState.selectedStrategyIds.findIndex(
      (s, idx) => idx !== selectedVariantIndex.value && isSameStrategyConfig(s, updatedConfig)
    )
    if (existingIndex >= 0) {
      // Duplicate found - show error message
      duplicateVariantError.value = 'This strategy with the same parameters is already selected. Please change the parameters to create a different variant.'
      return
    }
    
    // Clear error
    duplicateVariantError.value = null
    props.formState.selectedStrategyIds[selectedVariantIndex.value] = updatedConfig
  } else {
    // Adding new variant from modal
    const existingIndex = props.formState.selectedStrategyIds.findIndex((s) =>
      isSameStrategyConfig(s, updatedConfig)
    )
    if (existingIndex >= 0) {
      // Duplicate found - show error message
      duplicateVariantError.value = 'This strategy with the same parameters is already selected. Please change the parameters to create a different variant.'
      return
    }
    
    // Clear error
    duplicateVariantError.value = null
    
    // variantName is already set above
    props.formState.selectedStrategyIds.push(updatedConfig)
  }
  
  closeVariantParameterModal()
}

// Reset variant parameters
const resetVariantParameters = () => {
  if (!selectedStrategyForVariant.value || !strategyInfo[selectedStrategyForVariant.value]?.defaultParameters)
    return
  Object.assign(variantParameterForm, strategyInfo[selectedStrategyForVariant.value].defaultParameters!)
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



// Close parameter modal
function closeParameterModal() {
  parameterModalVisible.value = false
  selectedStrategyForParams.value = null
  Object.keys(parameterForm).forEach((key) => delete parameterForm[key])
}

// Save parameters (updates the first variant found, or creates new one if none exists)
function saveParameters() {
  if (!selectedStrategyForParams.value) return

  const variants = findStrategyVariants(props.formState.selectedStrategyIds, selectedStrategyForParams.value.id)
  const cleanedParams: Record<string, any> = {}
  Object.keys(parameterForm).forEach((key) => {
    if (parameterForm[key] !== undefined && parameterForm[key] !== null) {
      cleanedParams[key] = parameterForm[key]
    }
  })

  const updatedConfig: StrategyConfig = {
    strategyId: selectedStrategyForParams.value.id,
    parameters: Object.keys(cleanedParams).length > 0 ? cleanedParams : undefined,
  }

  if (variants.length > 0) {
    // Update the first variant
    const index = props.formState.selectedStrategyIds.findIndex((s) =>
      isSameStrategyConfig(s, variants[0])
    )
    if (index >= 0) {
      // Check if updated config already exists (different variant)
      const alreadyExists = props.formState.selectedStrategyIds.some(
        (s, idx) => idx !== index && isSameStrategyConfig(s, updatedConfig)
      )
      if (alreadyExists) {
        // Remove the old one since we're creating a duplicate
        props.formState.selectedStrategyIds.splice(index, 1)
      } else {
        props.formState.selectedStrategyIds[index] = updatedConfig
      }
    }
  } else {
    // No variant exists, create new one
    props.formState.selectedStrategyIds.push(updatedConfig)
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
