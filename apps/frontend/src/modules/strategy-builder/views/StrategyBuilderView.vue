<template>
  <div class="strategy-builder-view">
    <!-- Header -->
    <header class="builder-header">
      <div class="header-left">
        <a-button type="text" @click="handleCancel">
          <template #icon><ArrowLeftOutlined /></template>
          Back
        </a-button>
        <h1 class="header-title">
          {{ isEditMode ? 'Edit Custom Strategy' : 'Create Custom Strategy' }}
        </h1>
      </div>
      <div class="header-right">
        <a-button @click="handleCancel">Cancel</a-button>
        <a-button type="primary" :loading="isSaving" @click="handleSave">
          {{ isEditMode ? 'Update Strategy' : 'Save & Add to Comparison' }}
        </a-button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="builder-content">
      <!-- Left Panel: Rules -->
      <aside class="rules-panel">
        <RulesPanel
          :strategy-name="strategyName"
          :rules="currentStrategy?.rules || []"
          :rule-triggers="ruleTriggers"
          :rule-colors="ruleColors"
          @update:strategy-name="handleNameChange"
          @add-rule="handleAddRule"
          @update-rule="handleRuleUpdate"
          @delete-rule="handleRuleDelete"
        />
      </aside>

      <!-- Right Panel: Preview -->
      <main class="preview-panel">
        <PreviewPanel
          v-if="currentStrategy && currentStrategy.rules && currentStrategy.rules.length > 0"
          ref="previewRef"
          :strategy-config="currentStrategy"
          :start-date="formStartDate"
          :end-date="formEndDate"
          :timeframe="formTimeframe"
          :rule-colors="ruleColors"
          @preview-result="handlePreviewResult"
          @settings-change="handlePreviewSettingsChange"
        />
        <div v-else class="empty-preview">
          <a-empty description="Add rules to see preview">
            <template #image>
              <LineChartOutlined style="font-size: 64px; color: #d9d9d9" />
            </template>
          </a-empty>
        </div>
      </main>
    </div>

    <!-- Footer Summary -->
    <footer class="builder-footer">
      <div class="footer-summary">
        <span class="summary-item">
          <strong>{{ currentStrategy?.rules?.length || 0 }}</strong> rules
        </span>
        <span class="summary-divider">•</span>
        <span class="summary-item">
          <strong>{{ totalTriggers }}</strong> total triggers
        </span>
      </div>
      <div v-if="validationResult?.errors?.length" class="footer-errors">
        <ExclamationCircleOutlined class="text-red-500" />
        <span class="text-red-500">{{ validationResult.errors.length }} error(s)</span>
      </div>
    </footer>

    <!-- Settings Changed Confirmation Modal -->
    <SettingsChangedModal
      v-model:open="showSettingsConfirmModal"
      :changes="settingsChanges"
      @confirm="handleConfirmUpdateSettings"
      @cancel="handleKeepOriginalSettings"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button as AButton, Empty as AEmpty } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  LineChartOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue'
import { useStrategyBuilderStore } from '../stores/strategyBuilderStore'
import { strategyBuilderService } from '../services/strategyBuilderService'
import { useBacktestStore } from '@/modules/backtest/stores/backtestStore'
import RulesPanel from '../components/RulesPanel.vue'
import PreviewPanel from '../components/PreviewPanel.vue'
import SettingsChangedModal from '../components/SettingsChangedModal.vue'
import type { CustomRule, CustomStrategyConfig, RuleTriggerSummary } from '../api/strategyBuilderApi'
import dayjs from 'dayjs'

// Rule colors for markers
const RULE_COLORS = [
  '#26a69a', // Teal (green-ish)
  '#5c6bc0', // Indigo
  '#ab47bc', // Purple
  '#ef5350', // Red
  '#ff7043', // Deep Orange
  '#29b6f6', // Light Blue
  '#66bb6a', // Green
  '#ffa726', // Orange
]

interface PreviewSettings {
  startDate: string
  endDate: string
  timeframe: string
}

const router = useRouter()
const route = useRoute()
const strategyBuilderStore = useStrategyBuilderStore()
const backtestStore = useBacktestStore()

const strategyName = ref('')
const isSaving = ref(false)
const previewRef = ref<InstanceType<typeof PreviewPanel> | null>(null)

// Preview results
const ruleTriggers = ref<Map<string, RuleTriggerSummary>>(new Map())
const previewSettings = ref<PreviewSettings | null>(null)

// Settings confirmation
const showSettingsConfirmModal = ref(false)
const pendingAction = ref<'save' | null>(null)

// Get form settings from store or use defaults
const formStartDate = computed(() => backtestStore.formStartDate || dayjs().subtract(1, 'year').toISOString())
const formEndDate = computed(() => backtestStore.formEndDate || dayjs().toISOString())
const formTimeframe = computed(() => backtestStore.formTimeframe || '1d')

// Check if editing existing strategy
const isEditMode = computed(() => {
  return route.query.edit === 'true' && route.query.index !== undefined
})

const editIndex = computed(() => {
  const idx = route.query.index
  return idx !== undefined ? parseInt(idx as string, 10) : null
})

const currentStrategy = computed(() => strategyBuilderStore.currentStrategy)
const validationResult = computed(() => strategyBuilderStore.validationResult)

// Assign colors to rules
const ruleColors = computed(() => {
  const colors = new Map<string, string>()
  currentStrategy.value?.rules?.forEach((rule, index) => {
    const color = RULE_COLORS[index % RULE_COLORS.length] || '#666666'
    colors.set(rule.id, color)
  })
  return colors
})

// Total triggers across all rules
const totalTriggers = computed(() => {
  let total = 0
  ruleTriggers.value.forEach((summary) => {
    total += summary.triggerCount
  })
  return total
})

// Settings changes for confirmation modal
const settingsChanges = computed(() => {
  if (!previewSettings.value) {
    return { dateChanged: false, timeframeChanged: false }
  }

  const originalStart = dayjs(formStartDate.value).format('MMM YYYY')
  const originalEnd = dayjs(formEndDate.value).format('MMM YYYY')
  const newStart = dayjs(previewSettings.value.startDate).format('MMM YYYY')
  const newEnd = dayjs(previewSettings.value.endDate).format('MMM YYYY')

  const originalDateRange = `${originalStart} - ${originalEnd}`
  const newDateRange = `${newStart} - ${newEnd}`

  const normalizedOriginalTf = formTimeframe.value.toLowerCase()
  const normalizedNewTf = previewSettings.value.timeframe.toLowerCase()

  return {
    dateChanged: originalDateRange !== newDateRange,
    timeframeChanged: normalizedOriginalTf !== normalizedNewTf,
    originalDateRange,
    newDateRange,
    originalTimeframe: normalizedOriginalTf,
    newTimeframe: normalizedNewTf,
  }
})

// Initialize
onMounted(() => {
  if (isEditMode.value && editIndex.value !== null) {
    // Load existing strategy from store
    const strategies = backtestStore.formSelectedStrategyIds
    const existingStrategy = strategies[editIndex.value]
    if (existingStrategy && existingStrategy.strategyId === 'custom-strategy') {
      const customConfig = existingStrategy.parameters as CustomStrategyConfig
      strategyBuilderStore.setCurrentStrategy({
        name: existingStrategy.variantName || customConfig?.name || '',
        rules: customConfig?.rules || [],
      })
      strategyName.value = existingStrategy.variantName || customConfig?.name || ''
    }
  } else {
    // New strategy
    strategyBuilderStore.setCurrentStrategy({ name: '', rules: [] })
    strategyName.value = ''
  }
  strategyBuilderStore.setValidationResult(null)
})

onUnmounted(() => {
  // Clean up store when leaving
  strategyBuilderStore.reset()
})

// Handlers
function handleNameChange(name: string) {
  strategyName.value = name
  strategyBuilderStore.setStrategyName(name)
}

function handleAddRule() {
  const newRule = strategyBuilderService.createDefaultRule()
  strategyBuilderStore.addRule(newRule)
}

function handleRuleUpdate(ruleId: string, updatedRule: Partial<CustomRule>) {
  strategyBuilderStore.updateRule(ruleId, updatedRule)
}

function handleRuleDelete(ruleId: string) {
  strategyBuilderStore.deleteRule(ruleId)
  ruleTriggers.value.delete(ruleId)
}

function handlePreviewResult(summaries: RuleTriggerSummary[]) {
  const newMap = new Map<string, RuleTriggerSummary>()
  summaries.forEach((summary) => {
    newMap.set(summary.ruleId, summary)
  })
  ruleTriggers.value = newMap
}

function handlePreviewSettingsChange(settings: PreviewSettings) {
  previewSettings.value = settings
}

function handleCancel() {
  strategyBuilderStore.reset()
  router.back()
}

function hasSettingsChanged(): boolean {
  return settingsChanges.value.dateChanged || settingsChanges.value.timeframeChanged
}

async function handleSave() {
  if (!currentStrategy.value) return

  if (!currentStrategy.value.rules || currentStrategy.value.rules.length === 0) {
    strategyBuilderStore.setValidationResult({
      valid: false,
      errors: [{ level: 'error', field: 'rules', message: 'Strategy must have at least one rule' }],
      warnings: [],
    })
    return
  }

  isSaving.value = true
  try {
    const validation = await strategyBuilderService.validateStrategy(currentStrategy.value)
    if (!validation.valid) {
      isSaving.value = false
      return
    }

    // Check if settings changed
    if (previewSettings.value && hasSettingsChanged()) {
      pendingAction.value = 'save'
      showSettingsConfirmModal.value = true
      isSaving.value = false
      return
    }

    await finalizeSave()
  } catch (error) {
    strategyBuilderStore.setValidationResult({
      valid: false,
      errors: [{
        level: 'error',
        field: 'save',
        message: error instanceof Error ? error.message : 'Failed to save strategy.',
      }],
      warnings: [],
    })
    isSaving.value = false
  }
}

function handleConfirmUpdateSettings() {
  showSettingsConfirmModal.value = false
  if (previewSettings.value) {
    // Update form settings in store
    backtestStore.setFormStartDate(previewSettings.value.startDate)
    backtestStore.setFormEndDate(previewSettings.value.endDate)
    backtestStore.setFormTimeframe(previewSettings.value.timeframe)
  }
  if (pendingAction.value === 'save') {
    finalizeSave()
  }
}

function handleKeepOriginalSettings() {
  showSettingsConfirmModal.value = false
  if (pendingAction.value === 'save') {
    finalizeSave()
  }
}

async function finalizeSave() {
  if (!currentStrategy.value) return

  const strategyConfig = {
    strategyId: 'custom-strategy',
    variantName: currentStrategy.value.name || 'Custom Strategy',
    parameters: currentStrategy.value,
  }

  const currentStrategies = [...backtestStore.formSelectedStrategyIds]

  if (isEditMode.value && editIndex.value !== null) {
    // Update existing
    currentStrategies[editIndex.value] = strategyConfig
  } else {
    // Add new
    currentStrategies.push(strategyConfig)
  }

  backtestStore.setFormSelectedStrategyIds(currentStrategies)

  // Navigate back
  await router.push('/playground')
  strategyBuilderStore.reset()
  isSaving.value = false
}
</script>

<style scoped>
.strategy-builder-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.builder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  gap: 12px;
}

.builder-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.rules-panel {
  width: 360px;
  min-width: 320px;
  background: white;
  border-right: 1px solid #e8e8e8;
  overflow-y: auto;
  flex-shrink: 0;
}

.preview-panel {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: white;
  border-radius: 8px;
}

.builder-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-top: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.footer-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
}

.summary-divider {
  color: #d9d9d9;
}

.footer-errors {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
