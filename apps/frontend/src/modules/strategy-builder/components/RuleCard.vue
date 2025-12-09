<template>
  <div class="rule-card" :class="{ expanded: isExpanded }">
    <!-- Card Header (always visible) -->
    <div class="card-header" @click="$emit('toggle')">
      <div class="header-left">
        <div class="color-indicator" :style="{ backgroundColor: color }"></div>
        <div class="rule-info">
          <span class="rule-number">Rule #{{ ruleNumber }}</span>
          <span class="rule-summary">{{ conditionSummary }}</span>
        </div>
      </div>
      <div class="header-right">
        <a-tag v-if="triggerCount > 0" :color="tagColor" size="small">
          ⚡ {{ triggerCount }}
        </a-tag>
        <DownOutlined
          class="expand-icon"
          :class="{ rotated: isExpanded }"
        />
      </div>
    </div>

    <!-- Expanded Content -->
    <div v-if="isExpanded" class="card-content">
      <!-- WHEN Section -->
      <div class="content-section">
        <div class="section-title">
          <span>WHEN</span>
          <a-button type="link" size="small" @click="showConditionModal = true">
            + Add
          </a-button>
        </div>
        <div v-if="isCompoundCondition" class="logic-toggle">
          <a-radio-group
            :value="logicOperator"
            size="small"
            button-style="solid"
            @change="handleLogicOperatorChange"
          >
            <a-radio-button value="and">AND</a-radio-button>
            <a-radio-button value="or">OR</a-radio-button>
          </a-radio-group>
        </div>
        <div class="conditions-list">
          <div
            v-for="(cond, idx) in displayConditions"
            :key="idx"
            class="condition-row"
          >
            <ConditionBlock
              :condition="cond"
              compact
              @update="(updated) => handleConditionUpdate(idx, updated)"
            />
            <a-button
              type="text"
              danger
              size="small"
              @click="removeCondition(idx)"
            >
              <DeleteOutlined />
            </a-button>
          </div>
        </div>
      </div>

      <!-- THEN Section -->
      <div class="content-section">
        <div class="section-title">
          <span>THEN</span>
          <a-button type="link" size="small" @click="showActionModal = true">
            + Add
          </a-button>
        </div>
        <div class="actions-list">
          <div
            v-for="(action, idx) in rule.then"
            :key="idx"
            class="action-row"
          >
            <ActionBlock
              :action="action"
              compact
              @update="(updated) => handleActionUpdate(idx, updated)"
            />
            <a-button
              type="text"
              danger
              size="small"
              @click="removeAction(idx)"
            >
              <DeleteOutlined />
            </a-button>
          </div>
        </div>
      </div>

      <!-- Delete Rule -->
      <div class="delete-section">
        <a-popconfirm
          title="Delete this rule?"
          ok-text="Yes"
          cancel-text="No"
          @confirm="$emit('delete')"
        >
          <a-button type="text" danger block>
            <template #icon><DeleteOutlined /></template>
            Delete Rule
          </a-button>
        </a-popconfirm>
      </div>
    </div>

    <!-- Modals -->
    <ConditionTypeModal
      v-model:open="showConditionModal"
      @select="handleConditionTypeSelected"
    />
    <ActionTypeModal
      v-model:open="showActionModal"
      @select="handleActionTypeSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Button as AButton,
  Tag as ATag,
  RadioGroup as ARadioGroup,
  RadioButton as ARadioButton,
  Popconfirm as APopconfirm,
} from 'ant-design-vue'
import { DownOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import ConditionBlock from './ConditionBlock.vue'
import ActionBlock from './ActionBlock.vue'
import ConditionTypeModal from './ConditionTypeModal.vue'
import ActionTypeModal from './ActionTypeModal.vue'
import type {
  CustomRule,
  WhenCondition,
  ThenAction,
  AndCondition,
  OrCondition,
} from '../api/strategyBuilderApi'
import {
  createDefaultCondition,
  createDefaultAction,
} from '../services/strategyBuilderService'

interface Props {
  rule: CustomRule
  ruleNumber: number
  color: string
  triggerCount: number
  isExpanded: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggle: []
  update: [updated: Partial<CustomRule>]
  delete: []
}>()

const showConditionModal = ref(false)
const showActionModal = ref(false)

// Computed properties
const isCompoundCondition = computed(() => {
  return props.rule.when.type === 'and' || props.rule.when.type === 'or'
})

const logicOperator = computed(() => {
  if (props.rule.when.type === 'and') return 'and'
  if (props.rule.when.type === 'or') return 'or'
  return 'and'
})

const displayConditions = computed(() => {
  if (isCompoundCondition.value) {
    return (props.rule.when as AndCondition | OrCondition).conditions
  }
  return [props.rule.when]
})

const tagColor = computed(() => {
  if (props.triggerCount > 10) return 'green'
  if (props.triggerCount > 5) return 'blue'
  if (props.triggerCount > 0) return 'orange'
  return 'default'
})

const conditionSummary = computed(() => {
  const when = props.rule.when
  if (when.type === 'schedule') return `Schedule: ${when.frequency}`
  if (when.type === 'price_change') return `Price ${when.direction} ${(when.threshold * 100).toFixed(0)}%`
  if (when.type === 'price_level') return `Price ${when.operator} $${when.price.toLocaleString()}`
  if (when.type === 'indicator') return `${when.indicator.toUpperCase()} ${when.operator} ${when.value}`
  if (when.type === 'and' || when.type === 'or') {
    return `${when.conditions.length} conditions (${when.type.toUpperCase()})`
  }
  return when.type
})

// Handlers
function handleLogicOperatorChange() {
  if (isCompoundCondition.value) {
    // Toggle between 'and' and 'or'
    const newType = logicOperator.value === 'and' ? 'or' : 'and'
    const newWhen: AndCondition | OrCondition = {
      type: newType,
      conditions: (props.rule.when as AndCondition | OrCondition).conditions,
    }
    emit('update', { when: newWhen })
  }
}

function handleConditionUpdate(index: number, updated: WhenCondition) {
  if (isCompoundCondition.value) {
    const conditions = [...(props.rule.when as AndCondition | OrCondition).conditions]
    conditions[index] = updated
    const newWhen: AndCondition | OrCondition = {
      type: props.rule.when.type as 'and' | 'or',
      conditions,
    }
    emit('update', { when: newWhen })
  } else {
    emit('update', { when: updated })
  }
}

function removeCondition(index: number) {
  if (isCompoundCondition.value) {
    const conditions = (props.rule.when as AndCondition | OrCondition).conditions.filter(
      (_, i) => i !== index
    )
    if (conditions.length === 1) {
      emit('update', { when: conditions[0] })
    } else if (conditions.length > 1) {
      const newWhen: AndCondition | OrCondition = {
        type: props.rule.when.type as 'and' | 'or',
        conditions,
      }
      emit('update', { when: newWhen })
    } else {
      const defaultCond = createDefaultCondition('schedule')
      if (defaultCond) emit('update', { when: defaultCond })
    }
  } else {
    const defaultCond = createDefaultCondition('schedule')
    if (defaultCond) emit('update', { when: defaultCond })
  }
}

function handleConditionTypeSelected(type: string) {
  const newCondition = createDefaultCondition(type)
  if (!newCondition) return

  if (isCompoundCondition.value) {
    const newWhen: AndCondition | OrCondition = {
      type: props.rule.when.type as 'and' | 'or',
      conditions: [...(props.rule.when as AndCondition | OrCondition).conditions, newCondition],
    }
    emit('update', { when: newWhen })
  } else {
    const newWhen: AndCondition = {
      type: 'and',
      conditions: [props.rule.when, newCondition],
    }
    emit('update', { when: newWhen })
  }
}

function handleActionUpdate(index: number, updated: ThenAction) {
  const actions = [...props.rule.then]
  actions[index] = updated
  emit('update', { then: actions })
}

function removeAction(index: number) {
  const actions = props.rule.then.filter((_, i) => i !== index)
  emit('update', { then: actions })
}

function handleActionTypeSelected(type: string) {
  const newAction = createDefaultAction(type)
  if (!newAction) return
  emit('update', { then: [...props.rule.then, newAction] })
}
</script>

<style scoped>
.rule-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.rule-card:hover {
  border-color: #d0d0d0;
}

.rule-card.expanded {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  user-select: none;
}

.card-header:hover {
  background: #fafafa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.color-indicator {
  width: 4px;
  height: 32px;
  border-radius: 2px;
  flex-shrink: 0;
}

.rule-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rule-number {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.rule-summary {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  color: #999;
  transition: transform 0.2s;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

.card-content {
  border-top: 1px solid #f0f0f0;
  padding: 12px;
  background: #fafafa;
}

.content-section {
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.logic-toggle {
  margin-bottom: 8px;
}

.conditions-list,
.actions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.condition-row,
.action-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.condition-row > :first-child,
.action-row > :first-child {
  flex: 1;
}

.delete-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e8e8e8;
}
</style>
