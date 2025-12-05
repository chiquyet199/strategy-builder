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
        <StrategyPreview :strategy-config="currentStrategy" :investment-amount="10000" />
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Modal as AModal,
  FormItem as AFormItem,
  Input as AInput,
  Alert as AAlert,
  Button as AButton,
} from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useStrategyBuilderStore } from '../stores/strategyBuilderStore'
import { strategyBuilderService } from '../services/strategyBuilderService'
import RuleBlock from './RuleBlock.vue'
import StrategyPreview from './StrategyPreview.vue'
import type { CustomRule, CustomStrategyConfig } from '../api/strategyBuilderApi'

interface StrategyConfig {
  strategyId: string
  variantName?: string
  parameters?: CustomStrategyConfig
}

interface Props {
  open: boolean
  editStrategy?: StrategyConfig | null
  editIndex?: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [strategy: StrategyConfig, index?: number]
}>()

const strategyBuilderStore = useStrategyBuilderStore()
const strategyName = ref('')
const isSaving = ref(false)

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const isEditMode = computed(() => props.editStrategy !== null && props.editStrategy !== undefined)

const currentStrategy = computed(() => strategyBuilderStore.currentStrategy)
const validationResult = computed(() => strategyBuilderStore.validationResult)

// Initialize strategy when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
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

    // Emit save event with strategy and optional index for editing
    emit('save', strategyConfig, isEditMode.value ? (props.editIndex ?? undefined) : undefined)

    // Close modal
    visible.value = false
    strategyBuilderStore.reset()
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
  } finally {
    isSaving.value = false
  }
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
