<template>
  <div class="strategy-builder-view">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Strategy Builder</h1>
        <div class="flex gap-2">
          <a-button @click="handleCancel">Cancel</a-button>
          <a-button type="primary" :loading="isSaving" @click="handleSave">
            Save & Add to Comparison
          </a-button>
        </div>
      </div>

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
      <div class="space-y-4 mb-6">
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

      <!-- Preview Stats (Placeholder for Phase 3) -->
      <div class="preview-stats">
        <a-card title="Preview Stats">
          <p>Preview functionality will be available in Phase 3</p>
        </a-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button as AButton, FormItem as AFormItem, Input as AInput, Alert as AAlert, Card as ACard } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useStrategyBuilderStore } from '../stores/strategyBuilderStore'
import { strategyBuilderService } from '../services/strategyBuilderService'
import { useBacktestStore } from '@/modules/backtest/stores/backtestStore'
import RuleBlock from '../components/RuleBlock.vue'
import type { CustomRule } from '../api/strategyBuilderApi'

const router = useRouter()
const strategyBuilderStore = useStrategyBuilderStore()
const backtestStore = useBacktestStore()

const strategyName = ref('')
const isSaving = ref(false)

const currentStrategy = computed(() => strategyBuilderStore.currentStrategy)
const validationResult = computed(() => strategyBuilderStore.validationResult)

onMounted(() => {
  // Initialize with empty strategy if none exists
  if (!strategyBuilderStore.currentStrategy) {
    strategyBuilderStore.setCurrentStrategy({
      name: '',
      rules: [],
    })
  } else {
    strategyName.value = strategyBuilderStore.currentStrategy.name || ''
  }
})

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
  router.push('/playground')
}

const handleSave = async () => {
  if (!currentStrategy.value) return

  // Basic client-side validation
  if (!currentStrategy.value.rules || currentStrategy.value.rules.length === 0) {
    // Show error in UI
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
      // Show errors - don't proceed if there are validation errors
      console.error('Validation errors:', validation.errors)
      isSaving.value = false
      return
    }

    // Add strategy to backtest store
    const strategyConfig = {
      strategyId: 'custom-strategy',
      variantName: currentStrategy.value.name || 'Custom Strategy',
      parameters: currentStrategy.value,
    }

    // Add to selected strategies
    const currentStrategies = [...backtestStore.formSelectedStrategyIds]
    currentStrategies.push(strategyConfig)
    backtestStore.setFormSelectedStrategyIds(currentStrategies)

    // Navigate back to playground
    // Use await to ensure navigation completes before clearing loading state
    await router.push('/playground')
    
    // Clear loading state after successful navigation
    isSaving.value = false
  } catch (error) {
    console.error('Failed to save strategy:', error)
    // Show error to user
    strategyBuilderStore.setValidationResult({
      valid: false,
      errors: [
        {
          level: 'error',
          field: 'save',
          message: error instanceof Error ? error.message : 'Failed to save strategy. Please try again.',
        },
      ],
      warnings: [],
    })
    isSaving.value = false
  }
}
</script>

<style scoped>
.strategy-builder-view {
  min-height: 100vh;
  background: #f5f5f5;
}

.rule-block {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>

