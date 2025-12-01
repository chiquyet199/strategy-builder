<template>
  <div class="strategy-selection">
    <!-- Select All / Clear All Buttons -->
    <div class="strategy-selection-actions">
      <a-button-group>
        <a-button @click="selectAll">
          <template #icon>
            <CheckSquareOutlined />
          </template>
          {{ t('backtest.form.strategySelection.selectAll') }}
        </a-button>
        <a-button @click="clearAll">
          <template #icon>
            <CloseSquareOutlined />
          </template>
          {{ t('backtest.form.strategySelection.clearAll') }}
        </a-button>
      </a-button-group>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :sm="12" :md="8" v-for="strategy in availableStrategies" :key="strategy.id">
        <a-card
          :class="['strategy-card', { 'strategy-card-selected': isSelected(strategy.id) }]"
          :hoverable="true"
          @click="toggleStrategy(strategy.id)"
        >
          <template #title>
            <div class="strategy-card-header">
              <a-checkbox
                :checked="isSelected(strategy.id)"
                @click.stop
                @change="(e) => handleCheckboxChange(strategy.id, e.target.checked)"
              />
              <span class="strategy-name">{{ t(`backtest.strategies.${strategy.id}`) }}</span>
            </div>
          </template>

          <div class="strategy-description">
            <p>{{ t(`backtest.strategyDescriptions.${strategy.id}`) }}</p>
          </div>

          <div class="strategy-actions">
            <a-button
              type="link"
              size="small"
              @click.stop="openParameterModal(strategy)"
              :disabled="!isSelected(strategy.id)"
            >
              <template #icon>
                <SettingOutlined />
              </template>
              {{ t('backtest.customizeParameters') }}
            </a-button>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Parameter Customization Modal -->
    <a-modal
      v-model:open="parameterModalVisible"
      :title="t('backtest.parameterModal.title', { strategy: selectedStrategyForParams ? t(`backtest.strategies.${selectedStrategyForParams.id}`) : '' })"
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
          </template>

          <template v-else>
            <a-empty :description="t('backtest.parameterModal.noParameters')" />
          </template>

          <a-form-item v-if="selectedStrategyForParams && hasParameters(selectedStrategyForParams.id)">
            <a-space>
              <a-button type="primary" @click="saveParameters">{{ t('common.save') }}</a-button>
              <a-button @click="resetParameters">{{ t('backtest.parameterModal.resetToDefaults') }}</a-button>
              <a-button @click="closeParameterModal">{{ t('common.cancel') }}</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { SettingOutlined, CheckSquareOutlined, CloseSquareOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'

interface StrategyInfo {
  id: string
  hasParameters: boolean
  defaultParameters?: Record<string, any>
}

interface Props {
  modelValue: Array<{ strategyId: string; parameters?: Record<string, any> }>
}

interface Emits {
  (e: 'update:modelValue', value: Array<{ strategyId: string; parameters?: Record<string, any> }>): void
}

const { t } = useI18n()
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const availableStrategies: StrategyInfo[] = [
  { id: 'lump-sum', hasParameters: false },
  { id: 'dca', hasParameters: true, defaultParameters: { frequency: 'weekly' } },
  {
    id: 'rsi-dca',
    hasParameters: true,
    defaultParameters: { rsiPeriod: 14, oversoldThreshold: 30, overboughtThreshold: 70, buyMultiplier: 2.0 },
  },
  {
    id: 'dip-buyer-dca',
    hasParameters: true,
    defaultParameters: { lookbackDays: 30, dropThreshold: 0.1, buyMultiplier: 2.0 },
  },
  { id: 'moving-average-dca', hasParameters: true, defaultParameters: { maPeriod: 50, buyMultiplier: 2.0 } },
  {
    id: 'combined-smart-dca',
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
  {
    id: 'rebalancing',
    hasParameters: true,
    defaultParameters: {
      targetAllocation: 0.8, // 80%
      rebalanceThreshold: 0.1, // 10%
    },
  },
]

const parameterModalVisible = ref(false)
const selectedStrategyForParams = ref<StrategyInfo | null>(null)
const parameterForm = reactive<Record<string, any>>({})

const selectedStrategyIds = computed(() => {
  return props.modelValue.map((s) => s.strategyId)
})

function isSelected(strategyId: string): boolean {
  return selectedStrategyIds.value.includes(strategyId)
}

function toggleStrategy(strategyId: string) {
  const current = [...props.modelValue]
  const index = current.findIndex((s) => s.strategyId === strategyId)

  if (index >= 0) {
    current.splice(index, 1)
  } else {
    const strategy = availableStrategies.find((s) => s.id === strategyId)
    current.push({
      strategyId,
      parameters: strategy?.defaultParameters ? { ...strategy.defaultParameters } : undefined,
    })
  }

  emit('update:modelValue', current)
}

function handleCheckboxChange(strategyId: string, checked: boolean) {
  if (checked && !isSelected(strategyId)) {
    toggleStrategy(strategyId)
  } else if (!checked && isSelected(strategyId)) {
    toggleStrategy(strategyId)
  }
}

function hasParameters(strategyId: string): boolean {
  return availableStrategies.find((s) => s.id === strategyId)?.hasParameters || false
}

function openParameterModal(strategy: StrategyInfo) {
  selectedStrategyForParams.value = strategy
  const currentStrategy = props.modelValue.find((s) => s.strategyId === strategy.id)
  if (currentStrategy?.parameters) {
    Object.assign(parameterForm, currentStrategy.parameters)
  } else if (strategy.defaultParameters) {
    Object.assign(parameterForm, strategy.defaultParameters)
  }
  parameterModalVisible.value = true
}

function closeParameterModal() {
  parameterModalVisible.value = false
  selectedStrategyForParams.value = null
  Object.keys(parameterForm).forEach((key) => delete parameterForm[key])
}

function saveParameters() {
  if (!selectedStrategyForParams.value) return

  const current = [...props.modelValue]
  const index = current.findIndex((s) => s.strategyId === selectedStrategyForParams.value!.id)

  if (index >= 0) {
    const cleanedParams: Record<string, any> = {}
    Object.keys(parameterForm).forEach((key) => {
      if (parameterForm[key] !== undefined && parameterForm[key] !== null) {
        cleanedParams[key] = parameterForm[key]
      }
    })

    current[index] = {
      strategyId: selectedStrategyForParams.value.id,
      parameters: Object.keys(cleanedParams).length > 0 ? cleanedParams : undefined,
    }
  }

  emit('update:modelValue', current)
  closeParameterModal()
}

function resetParameters() {
  if (!selectedStrategyForParams.value?.defaultParameters) return
  Object.assign(parameterForm, selectedStrategyForParams.value.defaultParameters)
}

function selectAll() {
  const allStrategies = availableStrategies.map((strategy) => ({
    strategyId: strategy.id,
    parameters: strategy.defaultParameters ? { ...strategy.defaultParameters } : undefined,
  }))
  emit('update:modelValue', allStrategies)
}

function clearAll() {
  emit('update:modelValue', [])
}
</script>

<style scoped>
.strategy-selection {
  width: 100%;
}

.strategy-selection-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.strategy-card {
  height: 100%;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid #f0f0f0;
}

.strategy-card:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
}

.strategy-card-selected {
  border-color: #1890ff;
  background-color: #f0f7ff;
}

.strategy-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strategy-name {
  font-weight: 600;
  font-size: 16px;
}

.strategy-description {
  margin-top: 12px;
  margin-bottom: 12px;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  min-height: 60px;
}

.strategy-description p {
  margin: 0;
}

.strategy-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.parameter-form {
  padding: 8px 0;
}
</style>
