<template>
  <div class="parameter-variant-selection">
    <!-- Strategy Selector -->
    <div class="strategy-selector">
      <label class="strategy-selector-label">{{ t('backtest.variantMode.selectStrategy') }} <span class="required">*</span></label>
      <a-select
        v-model:value="selectedStrategyId"
        :placeholder="t('backtest.variantMode.selectStrategyPlaceholder')"
        style="width: 100%"
        size="large"
        @change="handleStrategyChange"
      >
        <a-select-option
          v-for="strategy in availableStrategies"
          :key="strategy.id"
          :value="strategy.id"
        >
          {{ t(`backtest.strategies.${strategy.id}`) }}
        </a-select-option>
      </a-select>
    </div>

    <!-- Variants List -->
    <div v-if="selectedStrategyId" class="variants-section">
      <div class="variants-header">
        <h3>{{ t('backtest.variantMode.variants') }}</h3>
        <a-button type="primary" @click="openAddVariantModal" :disabled="!selectedStrategyId">
          <template #icon>
            <PlusOutlined />
          </template>
          {{ t('backtest.variantMode.addVariant') }}
        </a-button>
      </div>

      <a-empty
        v-if="variants.length === 0"
        :description="t('backtest.variantMode.noVariants')"
        style="margin: 24px 0"
      />

      <a-list
        v-else
        :data-source="variants"
        :bordered="true"
        style="margin-top: 16px"
      >
        <template #renderItem="{ item, index }">
          <a-list-item>
            <template #actions>
              <a-button type="link" size="small" @click="editVariant(index)">
                {{ t('common.edit') }}
              </a-button>
              <a-button type="link" size="small" danger @click="removeVariant(index)">
                {{ t('common.delete') }}
              </a-button>
            </template>
            <a-list-item-meta>
              <template #title>
                <strong>{{ item.variantName }}</strong>
              </template>
              <template #description>
                <span>{{ t(`backtest.strategies.${item.strategyId}`) }}</span>
                <span v-if="hasParameters(item)" class="parameter-summary">
                  ({{ formatParameterSummary(item.parameters) }})
                </span>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </div>

    <!-- Add/Edit Variant Modal -->
    <a-modal
      v-model:open="variantModalVisible"
      :title="editingVariantIndex !== null ? t('backtest.variantMode.editVariant') : t('backtest.variantMode.addVariant')"
      :footer="null"
      width="600px"
      @cancel="closeVariantModal"
    >
      <a-form :model="variantForm" layout="vertical">
        <a-form-item
          :label="t('backtest.variantMode.variantName')"
          required
          :help="t('backtest.variantMode.variantNameHelp')"
        >
          <a-input
            v-model:value="variantForm.variantName"
            :placeholder="t('backtest.variantMode.variantNamePlaceholder')"
            :maxlength="50"
            show-count
          />
        </a-form-item>

        <a-divider>{{ t('backtest.variantMode.parameters') }}</a-divider>

        <!-- Parameter Forms (reuse from StrategySelection) -->
        <template v-if="selectedStrategyId === 'dca'">
          <a-form-item :help="t('backtest.parameters.dca.frequencyHelp')">
            <template #label>
              <span>
                {{ t('backtest.parameters.dca.frequency') }}
                <a-tooltip :title="t('backtest.parameters.dca.frequencyTooltip')">
                  <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: help;" />
                </a-tooltip>
              </span>
            </template>
            <a-select v-model:value="variantForm.parameters.frequency" style="width: 100%">
              <a-select-option value="daily">{{ t('backtest.parameters.dca.frequencyOptions.daily') }}</a-select-option>
              <a-select-option value="weekly">{{ t('backtest.parameters.dca.frequencyOptions.weekly') }}</a-select-option>
              <a-select-option value="monthly">{{ t('backtest.parameters.dca.frequencyOptions.monthly') }}</a-select-option>
            </a-select>
          </a-form-item>
        </template>

        <template v-else-if="selectedStrategyId === 'rsi-dca'">
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
              v-model:value="variantForm.parameters.rsiPeriod"
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
              v-model:value="variantForm.parameters.oversoldThreshold"
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
              v-model:value="variantForm.parameters.overboughtThreshold"
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
              v-model:value="variantForm.parameters.buyMultiplier"
              :min="0.1"
              :max="10"
              :step="0.1"
              style="width: 100%"
            />
          </a-form-item>
        </template>

        <template v-else-if="selectedStrategyId === 'dip-buyer-dca'">
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
              v-model:value="variantForm.parameters.lookbackDays"
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
              v-model:value="variantForm.parameters.dropThreshold"
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
              v-model:value="variantForm.parameters.buyMultiplier"
              :min="0.1"
              :max="10"
              :step="0.1"
              style="width: 100%"
            />
          </a-form-item>
        </template>

        <template v-else-if="selectedStrategyId === 'moving-average-dca'">
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
              v-model:value="variantForm.parameters.maPeriod"
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
              v-model:value="variantForm.parameters.buyMultiplier"
              :min="0.1"
              :max="10"
              :step="0.1"
              style="width: 100%"
            />
          </a-form-item>
        </template>

        <template v-else-if="selectedStrategyId === 'combined-smart-dca'">
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
              v-model:value="variantForm.parameters.rsiPeriod"
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
              v-model:value="variantForm.parameters.oversoldThreshold"
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
              v-model:value="variantForm.parameters.maPeriod"
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
              v-model:value="variantForm.parameters.lookbackDays"
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
              v-model:value="variantForm.parameters.dropThreshold"
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
              v-model:value="variantForm.parameters.maxMultiplier"
              :min="0.1"
              :max="10"
              :step="0.1"
              style="width: 100%"
            />
          </a-form-item>
        </template>

        <template v-else-if="selectedStrategyId === 'rebalancing'">
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
              v-model:value="variantForm.parameters.targetAllocation"
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
              v-model:value="variantForm.parameters.rebalanceThreshold"
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
            <a-select v-model:value="variantForm.parameters.rebalanceSchedule" style="width: 100%">
              <a-select-option value="none">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.none') }}</a-select-option>
              <a-select-option value="weekly">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.weekly') }}</a-select-option>
              <a-select-option value="monthly">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.monthly') }}</a-select-option>
              <a-select-option value="quarterly">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.quarterly') }}</a-select-option>
              <a-select-option value="half-yearly">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.halfYearly') }}</a-select-option>
              <a-select-option value="yearly">{{ t('backtest.parameters.rebalancing.rebalanceScheduleOptions.yearly') }}</a-select-option>
            </a-select>
          </a-form-item>
        </template>

        <template v-else>
          <a-empty :description="t('backtest.parameterModal.noParameters')" />
        </template>

        <a-form-item>
          <a-space>
            <a-button type="primary" @click="saveVariant">{{ t('common.save') }}</a-button>
            <a-button @click="closeVariantModal">{{ t('common.cancel') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'
import type { Variant } from '@/shared/types/backtest'

interface Props {
  modelValue: Variant[]
}

interface Emits {
  (e: 'update:modelValue', value: Variant[]): void
}

const { t } = useI18n()
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const availableStrategies = [
  { id: 'lump-sum', hasParameters: false, defaultParameters: {} },
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
      rebalanceSchedule: 'none', // 'none', 'weekly', or 'monthly'
    },
  },
]

const selectedStrategyId = ref<string>('')
const variants = ref<Variant[]>([])
const variantModalVisible = ref(false)
const editingVariantIndex = ref<number | null>(null)
const variantForm = reactive<{ variantName: string; parameters: Record<string, any> }>({
  variantName: '',
  parameters: {},
})

// Sync variants with modelValue
watch(
  () => props.modelValue,
  (newVal) => {
    variants.value = [...newVal]
    if (newVal.length > 0 && !selectedStrategyId.value) {
      selectedStrategyId.value = newVal[0].strategyId
    }
  },
  { immediate: true, deep: true },
)

// Emit changes
watch(
  () => variants.value,
  (newVal) => {
    emit('update:modelValue', [...newVal])
  },
  { deep: true },
)

function handleStrategyChange() {
  // Clear variants when strategy changes
  variants.value = []
  emit('update:modelValue', [])
}

function openAddVariantModal() {
  editingVariantIndex.value = null
  variantForm.variantName = ''
  const strategy = availableStrategies.find((s) => s.id === selectedStrategyId.value)
  variantForm.parameters = strategy?.defaultParameters ? { ...strategy.defaultParameters } : {}
  variantModalVisible.value = true
}

function editVariant(index: number) {
  editingVariantIndex.value = index
  const variant = variants.value[index]
  variantForm.variantName = variant.variantName
  variantForm.parameters = variant.parameters ? { ...variant.parameters } : {}
  variantModalVisible.value = true
}

function removeVariant(index: number) {
  variants.value.splice(index, 1)
}

function saveVariant() {
  if (!variantForm.variantName.trim()) {
    return
  }

  // Check for duplicate names
  const existingIndex = variants.value.findIndex(
    (v, idx) => v.variantName === variantForm.variantName && idx !== editingVariantIndex.value,
  )
  if (existingIndex !== -1) {
    return
  }

  const variant: Variant = {
    strategyId: selectedStrategyId.value,
    variantName: variantForm.variantName.trim(),
    parameters: Object.keys(variantForm.parameters).length > 0 ? { ...variantForm.parameters } : undefined,
  }

  if (editingVariantIndex.value !== null) {
    variants.value[editingVariantIndex.value] = variant
  } else {
    variants.value.push(variant)
  }

  closeVariantModal()
}

function closeVariantModal() {
  variantModalVisible.value = false
  editingVariantIndex.value = null
  variantForm.variantName = ''
  variantForm.parameters = {}
}

function hasParameters(variant: Variant): boolean {
  return variant.parameters !== undefined && Object.keys(variant.parameters).length > 0
}

function formatParameterSummary(parameters?: Record<string, unknown>): string {
  if (!parameters || Object.keys(parameters).length === 0) {
    return t('backtest.variantMode.defaultParameters')
  }

  const parts: string[] = []
  if (parameters.frequency) parts.push(`Freq: ${parameters.frequency}`)
  if (parameters.rsiPeriod) parts.push(`RSI: ${parameters.rsiPeriod}`)
  if (parameters.oversoldThreshold) parts.push(`Oversold: ${parameters.oversoldThreshold}`)
  if (parameters.maPeriod) parts.push(`MA: ${parameters.maPeriod}`)
  if (parameters.lookbackDays) parts.push(`Lookback: ${parameters.lookbackDays}`)
  if (parameters.dropThreshold && typeof parameters.dropThreshold === 'number') {
    parts.push(`Drop: ${(parameters.dropThreshold * 100).toFixed(0)}%`)
  }
  if (parameters.buyMultiplier) parts.push(`Multiplier: ${parameters.buyMultiplier}x`)
  if (parameters.maxMultiplier) parts.push(`Max: ${parameters.maxMultiplier}x`)

  return parts.join(', ')
}
</script>

<style scoped>
.parameter-variant-selection {
  width: 100%;
}

.strategy-selector {
  margin-bottom: 24px;
}

.strategy-selector-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.strategy-selector-label .required {
  color: #ff4d4f;
  margin-left: 4px;
}

.variants-section {
  margin-top: 24px;
}

.variants-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.variants-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.parameter-summary {
  color: #666;
  font-size: 12px;
  margin-left: 8px;
}
</style>
