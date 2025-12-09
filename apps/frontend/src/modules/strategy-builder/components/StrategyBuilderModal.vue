<template>
  <a-modal
    v-model:open="visible"
    :title="isEditMode ? 'Edit Custom Strategy' : 'Create Custom Strategy'"
    :width="900"
    :footer="null"
    :z-index="1002"
    @cancel="handleCancel"
  >
    <div class="strategy-builder-modal">
      <!-- Strategy Name -->
      <div class="mb-6">
        <a-form-item label="Strategy Name">
          <a-input
            v-model:value="strategyName"
            placeholder="My Custom Strategy"
            @change="handleNameChange"
          />
        </a-form-item>
      </div>

      <!-- Rules List -->
      <div class="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
        <div
          v-for="(rule, index) in currentStrategy?.rules || []"
          :key="rule.id"
          class="rule-block"
        >
          <RuleBlock
            :rule="rule"
            :rule-number="index + 1"
            @update="handleRuleUpdate"
            @delete="handleRuleDelete"
          />
        </div>
      </div>

      <!-- Add Rule Button -->
      <div class="mb-6">
        <a-button type="dashed" block @click="handleAddRule">
          <template #icon>
            <PlusOutlined />
          </template>
          Add Rule
        </a-button>
      </div>

      <!-- Preview Section -->
      <div
        v-if="currentStrategy && currentStrategy.rules && currentStrategy.rules.length > 0"
        class="mb-6 border-t pt-6"
      >
        <StrategyPreview
          ref="previewRef"
          :strategy-config="currentStrategy"
          :investment-amount="10000"
          :start-date="props.startDate"
          :end-date="props.endDate"
          :timeframe="props.timeframe"
          @settings-change="handlePreviewSettingsChange"
        />
      </div>

      <!-- Validation Errors/Warnings -->
      <div v-if="validationResult" class="mb-6">
        <a-alert
          v-if="validationResult.errors.length > 0"
          type="error"
          :message="`${validationResult.errors.length} error(s) found`"
          show-icon
          class="mb-4"
        >
          <template #description>
            <ul class="list-disc list-inside">
              <li v-for="(error, index) in validationResult.errors" :key="index">
                <strong>{{ error.field }}:</strong> {{ error.message }}
              </li>
            </ul>
          </template>
        </a-alert>
        <a-alert
          v-if="validationResult.warnings.length > 0"
          type="warning"
          :message="`${validationResult.warnings.length} warning(s)`"
          show-icon
        >
          <template #description>
            <ul class="list-disc list-inside">
              <li v-for="(warning, index) in validationResult.warnings" :key="index">
                <strong>{{ warning.field }}:</strong> {{ warning.message }}
              </li>
            </ul>
          </template>
        </a-alert>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-2 pt-4 border-t">
        <a-button @click="handleCancel">Cancel</a-button>
        <a-button type="primary" :loading="isSaving" @click="handleSave">
          {{ isEditMode ? 'Update Strategy' : 'Save & Add to Comparison' }}
        </a-button>
      </div>
    </div>
  </a-modal>

  <!-- Settings Changed Confirmation Modal -->
  <a-modal
    v-model:open="showSettingsConfirmModal"
    title="Preview Settings Changed"
    :z-index="1003"
    @ok="handleConfirmUpdateSettings"
    @cancel="handleKeepOriginalSettings"
  >
    <div class="space-y-4">
      <p class="text-gray-700">
        You tested the strategy with different settings than the main form:
      </p>

      <div class="bg-gray-50 p-4 rounded-lg space-y-2">
        <div v-if="settingsChanges.dateChanged" class="flex items-start gap-2">
          <span class="text-gray-500 w-24">Time Period:</span>
          <div>
            <div class="text-green-600">{{ settingsChanges.newDateRange }}</div>
            <div class="text-gray-400 text-sm line-through">{{ settingsChanges.originalDateRange }}</div>
          </div>
        </div>
        <div v-if="settingsChanges.timeframeChanged" class="flex items-start gap-2">
          <span class="text-gray-500 w-24">Timeframe:</span>
          <div>
            <div class="text-green-600">{{ formatTimeframe(settingsChanges.newTimeframe) }}</div>
            <div class="text-gray-400 text-sm line-through">{{ formatTimeframe(settingsChanges.originalTimeframe) }}</div>
          </div>
        </div>
      </div>

      <p class="text-orange-600 text-sm">
        <ExclamationCircleOutlined class="mr-1" />
        If you keep the original settings, the backtest results may differ from what you previewed.
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <a-button @click="handleKeepOriginalSettings">Keep Original</a-button>
        <a-button type="primary" @click="handleConfirmUpdateSettings">
          Update Form Settings
        </a-button>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, withDefaults } from 'vue'
import {
  Modal as AModal,
  FormItem as AFormItem,
  Input as AInput,
  Alert as AAlert,
  Button as AButton,
} from 'ant-design-vue'
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useStrategyBuilderStore } from '../stores/strategyBuilderStore'
import { strategyBuilderService } from '../services/strategyBuilderService'
import RuleBlock from './RuleBlock.vue'
import StrategyPreview from './StrategyPreview.vue'
import type { CustomRule, CustomStrategyConfig } from '../api/strategyBuilderApi'
import dayjs from 'dayjs'

interface StrategyConfig {
  strategyId: string
  variantName?: string
  parameters?: CustomStrategyConfig
}

interface PreviewSettings {
  startDate: string
  endDate: string
  timeframe: string
}

interface Props {
  open: boolean
  editStrategy?: StrategyConfig | null
  editIndex?: number | null
  /** Start date from form panel (ISO string) */
  startDate?: string
  /** End date from form panel (ISO string) */
  endDate?: string
  /** Timeframe from form panel (e.g., '1d', '1w') */
  timeframe?: string
}

const props = withDefaults(defineProps<Props>(), {
  startDate: undefined,
  endDate: undefined,
  timeframe: '1d',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [strategy: StrategyConfig, index?: number]
  'update-settings': [settings: PreviewSettings]
}>()

const strategyBuilderStore = useStrategyBuilderStore()
const strategyName = ref('')
const isSaving = ref(false)
const previewRef = ref<InstanceType<typeof StrategyPreview> | null>(null)

// Track current preview settings
const currentPreviewSettings = ref<PreviewSettings | null>(null)

// Settings confirmation modal
const showSettingsConfirmModal = ref(false)
const pendingStrategyConfig = ref<StrategyConfig | null>(null)

// Settings changes for display
const settingsChanges = computed(() => {
  if (!currentPreviewSettings.value || !props.startDate) {
    return {
      dateChanged: false,
      timeframeChanged: false,
      originalDateRange: '',
      newDateRange: '',
      originalTimeframe: '',
      newTimeframe: '',
    }
  }

  const originalStart = dayjs(props.startDate).format('MMM YYYY')
  const originalEnd = dayjs(props.endDate).format('MMM YYYY')
  const newStart = dayjs(currentPreviewSettings.value.startDate).format('MMM YYYY')
  const newEnd = dayjs(currentPreviewSettings.value.endDate).format('MMM YYYY')

  const originalDateRange = `${originalStart} - ${originalEnd}`
  const newDateRange = `${newStart} - ${newEnd}`

  const normalizedOriginalTf = (props.timeframe || '1d').toLowerCase()
  const normalizedNewTf = currentPreviewSettings.value.timeframe.toLowerCase()

  return {
    dateChanged: originalDateRange !== newDateRange,
    timeframeChanged: normalizedOriginalTf !== normalizedNewTf,
    originalDateRange,
    newDateRange,
    originalTimeframe: normalizedOriginalTf,
    newTimeframe: normalizedNewTf,
  }
})

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const isEditMode = computed(() => props.editStrategy !== null && props.editStrategy !== undefined)

const currentStrategy = computed(() => strategyBuilderStore.currentStrategy)
const validationResult = computed(() => strategyBuilderStore.validationResult)

// Format timeframe for display
function formatTimeframe(tf: string): string {
  const map: Record<string, string> = {
    '1h': 'Hourly (1H)',
    '4h': '4 Hours (4H)',
    '1d': 'Daily (1D)',
    '1w': 'Weekly (1W)',
    '1m': 'Monthly (1M)',
  }
  return map[tf.toLowerCase()] || tf
}

// Initialize strategy when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      // Reset preview settings tracking
      currentPreviewSettings.value = null

      if (isEditMode.value && props.editStrategy) {
        // Load existing strategy for editing
        const customConfig = props.editStrategy.parameters as CustomStrategyConfig
        if (customConfig) {
          strategyBuilderStore.setCurrentStrategy({
            name: props.editStrategy.variantName || customConfig.name || '',
            rules: customConfig.rules || [],
          })
          strategyName.value = props.editStrategy.variantName || customConfig.name || ''
        } else {
          // Initialize empty if no parameters
          strategyBuilderStore.setCurrentStrategy({
            name: props.editStrategy.variantName || '',
            rules: [],
          })
          strategyName.value = props.editStrategy.variantName || ''
        }
      } else {
        // Initialize empty strategy for new
        strategyBuilderStore.setCurrentStrategy({
          name: '',
          rules: [],
        })
        strategyName.value = ''
      }
      // Clear validation results
      strategyBuilderStore.setValidationResult(null)
    } else {
      // Reset when closing
      strategyBuilderStore.reset()
      currentPreviewSettings.value = null
    }
  },
  { immediate: true },
)

const handleNameChange = () => {
  strategyBuilderStore.setStrategyName(strategyName.value)
}

const handleAddRule = () => {
  const newRule = strategyBuilderService.createDefaultRule()
  strategyBuilderStore.addRule(newRule)
}

const handleRuleUpdate = (ruleId: string, updatedRule: Partial<CustomRule>) => {
  strategyBuilderStore.updateRule(ruleId, updatedRule)
}

const handleRuleDelete = (ruleId: string) => {
  strategyBuilderStore.deleteRule(ruleId)
}

const handleCancel = () => {
  strategyBuilderStore.reset()
  visible.value = false
}

/**
 * Handle settings change from preview
 */
function handlePreviewSettingsChange(settings: PreviewSettings) {
  currentPreviewSettings.value = settings
}

/**
 * Check if settings have changed
 */
function hasSettingsChanged(): boolean {
  return settingsChanges.value.dateChanged || settingsChanges.value.timeframeChanged
}

const handleSave = async () => {
  if (!currentStrategy.value) return

  // Basic client-side validation
  if (!currentStrategy.value.rules || currentStrategy.value.rules.length === 0) {
    strategyBuilderStore.setValidationResult({
      valid: false,
      errors: [
        {
          level: 'error',
          field: 'rules',
          message: 'Strategy must have at least one rule',
        },
      ],
      warnings: [],
    })
    return
  }

  isSaving.value = true
  try {
    // Validate strategy
    const validation = await strategyBuilderService.validateStrategy(currentStrategy.value)

    if (!validation.valid) {
      console.error('Validation errors:', validation.errors)
      isSaving.value = false
      return
    }

    // Create strategy config
    const strategyConfig: StrategyConfig = {
      strategyId: 'custom-strategy',
      variantName: currentStrategy.value.name || 'Custom Strategy',
      parameters: currentStrategy.value,
    }

    // Check if preview settings were changed
    if (currentPreviewSettings.value && hasSettingsChanged()) {
      // Show confirmation dialog
      pendingStrategyConfig.value = strategyConfig
      showSettingsConfirmModal.value = true
      isSaving.value = false
      return
    }

    // No settings change, save directly
    finalizeSave(strategyConfig)
  } catch (error) {
    console.error('Failed to save strategy:', error)
    strategyBuilderStore.setValidationResult({
      valid: false,
      errors: [
        {
          level: 'error',
          field: 'save',
          message:
            error instanceof Error ? error.message : 'Failed to save strategy. Please try again.',
        },
      ],
      warnings: [],
    })
    isSaving.value = false
  }
}

/**
 * User chose to update form settings
 */
function handleConfirmUpdateSettings() {
  showSettingsConfirmModal.value = false
  if (pendingStrategyConfig.value && currentPreviewSettings.value) {
    // Emit settings update event
    emit('update-settings', currentPreviewSettings.value)
    finalizeSave(pendingStrategyConfig.value)
  }
}

/**
 * User chose to keep original settings
 */
function handleKeepOriginalSettings() {
  showSettingsConfirmModal.value = false
  if (pendingStrategyConfig.value) {
    finalizeSave(pendingStrategyConfig.value)
  }
}

/**
 * Complete the save process
 */
function finalizeSave(strategyConfig: StrategyConfig) {
  // Emit save event with strategy and optional index for editing
  emit('save', strategyConfig, isEditMode.value ? (props.editIndex ?? undefined) : undefined)

  // Close modal
  visible.value = false
  strategyBuilderStore.reset()
  pendingStrategyConfig.value = null
  isSaving.value = false
}
</script>

<style scoped>
.strategy-builder-modal {
  padding: 8px 0;
}

.rule-block {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
