<template>
  <a-modal
    v-model:open="visible"
    :title="null"
    :width="'100%'"
    :footer="null"
    :closable="false"
    wrap-class-name="fullscreen-modal"
    :body-style="{ padding: 0, height: '100vh', overflow: 'hidden' }"
    :style="{ top: 0, paddingBottom: 0, maxWidth: '100vw' }"
  >
    <div class="fullscreen-builder">
      <!-- Header -->
      <header class="builder-header">
        <div class="header-left">
          <a-button type="text" @click="handleCancel">
            <template #icon><ArrowLeftOutlined /></template>
            Back to Form
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
            :start-date="props.startDate"
            :end-date="props.endDate"
            :timeframe="props.timeframe"
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
        <template v-if="previewSettings">
          <span class="summary-divider">•</span>
          <span class="summary-item">
            Tested {{ formatDateRange(previewSettings.startDate, previewSettings.endDate) }}
            ({{ formatTimeframe(previewSettings.timeframe) }})
          </span>
        </template>
        </div>
        <div v-if="validationResult?.errors?.length" class="footer-errors">
          <ExclamationCircleOutlined class="text-red-500" />
          <span class="text-red-500">{{ validationResult.errors.length }} error(s)</span>
        </div>
      </footer>
    </div>
  </a-modal>

  <!-- Settings Changed Confirmation Modal -->
  <SettingsChangedModal
    v-model:open="showSettingsConfirmModal"
    :changes="settingsChanges"
    @confirm="handleConfirmUpdateSettings"
    @cancel="handleKeepOriginalSettings"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal as AModal, Button as AButton, Empty as AEmpty } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  LineChartOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue'
import { useStrategyBuilderStore } from '../stores/strategyBuilderStore'
import { strategyBuilderService } from '../services/strategyBuilderService'
import RulesPanel from './RulesPanel.vue'
import PreviewPanel from './PreviewPanel.vue'
import SettingsChangedModal from './SettingsChangedModal.vue'
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
  startDate?: string
  endDate?: string
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
const previewRef = ref<InstanceType<typeof PreviewPanel> | null>(null)

// Preview results
const ruleTriggers = ref<Map<string, RuleTriggerSummary>>(new Map())
const previewSettings = ref<PreviewSettings | null>(null)

// Settings confirmation
const showSettingsConfirmModal = ref(false)
const pendingStrategyConfig = ref<StrategyConfig | null>(null)

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const isEditMode = computed(() => props.editStrategy !== null && props.editStrategy !== undefined)
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
  if (!previewSettings.value || !props.startDate) {
    return { dateChanged: false, timeframeChanged: false }
  }

  const originalStart = dayjs(props.startDate).format('MMM YYYY')
  const originalEnd = dayjs(props.endDate).format('MMM YYYY')
  const newStart = dayjs(previewSettings.value.startDate).format('MMM YYYY')
  const newEnd = dayjs(previewSettings.value.endDate).format('MMM YYYY')

  const originalDateRange = `${originalStart} - ${originalEnd}`
  const newDateRange = `${newStart} - ${newEnd}`

  const normalizedOriginalTf = (props.timeframe || '1d').toLowerCase()
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

// Format helpers
function formatDateRange(start: string | undefined, end: string | undefined): string {
  if (!start || !end) return ''
  return `${dayjs(start).format('MMM YYYY')} - ${dayjs(end).format('MMM YYYY')}`
}

function formatTimeframe(tf: string): string {
  const map: Record<string, string> = {
    '1h': 'Hourly',
    '4h': '4H',
    '1d': 'Daily',
    '1w': 'Weekly',
    '1m': 'Monthly',
  }
  return map[tf.toLowerCase()] || tf
}

// Initialize strategy when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      ruleTriggers.value = new Map()
      previewSettings.value = null

      if (isEditMode.value && props.editStrategy) {
        const customConfig = props.editStrategy.parameters as CustomStrategyConfig
        if (customConfig) {
          strategyBuilderStore.setCurrentStrategy({
            name: props.editStrategy.variantName || customConfig.name || '',
            rules: customConfig.rules || [],
          })
          strategyName.value = props.editStrategy.variantName || customConfig.name || ''
        } else {
          strategyBuilderStore.setCurrentStrategy({
            name: props.editStrategy.variantName || '',
            rules: [],
          })
          strategyName.value = props.editStrategy.variantName || ''
        }
      } else {
        strategyBuilderStore.setCurrentStrategy({ name: '', rules: [] })
        strategyName.value = ''
      }
      strategyBuilderStore.setValidationResult(null)
    } else {
      strategyBuilderStore.reset()
      ruleTriggers.value = new Map()
      previewSettings.value = null
    }
  },
  { immediate: true }
)

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
  visible.value = false
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

    const strategyConfig: StrategyConfig = {
      strategyId: 'custom-strategy',
      variantName: currentStrategy.value.name || 'Custom Strategy',
      parameters: currentStrategy.value,
    }

    if (previewSettings.value && hasSettingsChanged()) {
      pendingStrategyConfig.value = strategyConfig
      showSettingsConfirmModal.value = true
      isSaving.value = false
      return
    }

    finalizeSave(strategyConfig)
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
  if (pendingStrategyConfig.value && previewSettings.value) {
    emit('update-settings', previewSettings.value)
    finalizeSave(pendingStrategyConfig.value)
  }
}

function handleKeepOriginalSettings() {
  showSettingsConfirmModal.value = false
  if (pendingStrategyConfig.value) {
    finalizeSave(pendingStrategyConfig.value)
  }
}

function finalizeSave(strategyConfig: StrategyConfig) {
  emit('save', strategyConfig, isEditMode.value ? (props.editIndex ?? undefined) : undefined)
  visible.value = false
  strategyBuilderStore.reset()
  pendingStrategyConfig.value = null
  isSaving.value = false
}
</script>

<style scoped>
.fullscreen-builder {
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

<style>
/* Global styles for fullscreen modal */
.fullscreen-modal .ant-modal {
  max-width: 100vw !important;
  margin: 0 !important;
  padding: 0 !important;
}

.fullscreen-modal .ant-modal-content {
  border-radius: 0 !important;
  height: 100vh !important;
  padding: 0 !important;
}

.fullscreen-modal .ant-modal-body {
  padding: 0 !important;
}
</style>
