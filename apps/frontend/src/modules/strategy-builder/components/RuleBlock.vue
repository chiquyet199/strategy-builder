<template>
  <div class="rule-block">
    <div class="rule-header">
      <h3 class="rule-title">Rule #{{ ruleNumber }}</h3>
      <a-button type="text" danger @click="handleDelete">
        Delete
      </a-button>
    </div>

    <!-- WHEN Section -->
    <div class="section">
      <div class="section-header">
        <h4 class="section-title">WHEN (Conditions)</h4>
        <div v-if="isAndCondition || isOrCondition" class="logic-toggle">
          <span class="logic-label">Logic:</span>
          <a-radio-group
            v-model:value="logicOperator"
            size="small"
            @change="handleLogicOperatorChange"
          >
            <a-radio-button value="and">AND</a-radio-button>
            <a-radio-button value="or">OR</a-radio-button>
          </a-radio-group>
        </div>
      </div>
      <div v-if="isAndCondition || isOrCondition" class="conditions-list">
        <div v-for="(cond, index) in combinedConditions" :key="index" class="condition-item">
          <div class="condition-wrapper">
            <ConditionBlock
              :condition="cond"
              @update="(updated) => handleConditionInListUpdate(index, updated)"
            />
            <a-button
              type="text"
              danger
              size="small"
              @click="removeCondition(index)"
              class="ml-2"
            >
              Remove
            </a-button>
          </div>
          <div v-if="index < combinedConditions.length - 1" class="logic-separator">
            {{ logicOperator.toUpperCase() }}
          </div>
        </div>
      </div>
      <div v-else class="condition-item">
        <div class="condition-wrapper">
          <ConditionBlock
            :condition="rule.when"
            @update="handleConditionUpdate"
          />
          <a-button
            type="text"
            danger
            size="small"
            @click="removeSingleCondition"
            class="ml-2"
          >
            Remove
          </a-button>
        </div>
      </div>
      <a-button type="dashed" size="small" class="mt-2" @click="showConditionModal = true">
        + Add Condition
      </a-button>
      <div v-if="!rule.when" class="text-sm text-gray-500 mt-2 italic">
        No condition set. Please add a condition above.
      </div>
    </div>

    <!-- THEN Section -->
    <div class="section">
      <h4 class="section-title">THEN (Actions)</h4>
      <div v-for="(action, index) in rule.then" :key="index" class="action-item">
        <ActionBlock
          :action="action"
          @update="(updated) => handleActionUpdate(index, updated)"
        />
        <a-button
          type="text"
          danger
          size="small"
          @click="removeAction(index)"
          class="ml-2"
        >
          Remove
        </a-button>
      </div>
      <a-button type="dashed" size="small" class="mt-2" @click="showActionModal = true">
        + Add Action
      </a-button>
    </div>
    
    <!-- Condition Type Modal -->
    <ConditionTypeModal
      v-model:open="showConditionModal"
      @select="handleConditionTypeSelected"
    />
    
    <!-- Action Type Modal -->
    <ActionTypeModal
      v-model:open="showActionModal"
      @select="handleActionTypeSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button as AButton, RadioGroup as ARadioGroup, RadioButton as ARadioButton } from 'ant-design-vue'
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
  ScheduleCondition,
  PriceChangeCondition,
  PriceLevelCondition,
  PriceStreakCondition,
  VolumeChangeCondition,
  IndicatorCondition,
  BuyFixedAction,
  BuyPercentageAction,
  BuyScaledAction,
  SellFixedAction,
  SellPercentageAction,
  RebalanceAction,
  LimitOrderAction,
} from '../api/strategyBuilderApi'

interface Props {
  rule: CustomRule
  ruleNumber: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [ruleId: string, updatedRule: Partial<CustomRule>]
  delete: [ruleId: string]
}>()

const showConditionModal = ref(false)
const showActionModal = ref(false)

// Check if current condition is an AND/OR condition (multiple conditions)
const isAndCondition = computed(() => {
  return props.rule.when.type === 'and'
})

const isOrCondition = computed(() => {
  return props.rule.when.type === 'or'
})

const logicOperator = computed(() => {
  if (props.rule.when.type === 'and') return 'and'
  if (props.rule.when.type === 'or') return 'or'
  return 'and' // Default
})

const combinedConditions = computed(() => {
  if (props.rule.when.type === 'and' || props.rule.when.type === 'or') {
    return props.rule.when.conditions
  }
  return [props.rule.when]
})

const handleConditionUpdate = (condition: WhenCondition) => {
  emit('update', props.rule.id, { when: condition })
}

const handleConditionInListUpdate = (index: number, updated: WhenCondition) => {
  if (props.rule.when.type === 'and' || props.rule.when.type === 'or') {
    const updatedConditions = [...props.rule.when.conditions]
    updatedConditions[index] = updated
    const newWhen: AndCondition | OrCondition = {
      type: props.rule.when.type,
      conditions: updatedConditions,
    }
    emit('update', props.rule.id, { when: newWhen })
  }
}

const handleLogicOperatorChange = () => {
  if (props.rule.when.type === 'and' || props.rule.when.type === 'or') {
    const newWhen: AndCondition | OrCondition = {
      type: logicOperator.value as 'and' | 'or',
      conditions: props.rule.when.conditions,
    }
    emit('update', props.rule.id, { when: newWhen })
  }
}

const removeCondition = (index: number) => {
  if (props.rule.when.type === 'and' || props.rule.when.type === 'or') {
    const updatedConditions = props.rule.when.conditions.filter((_, i) => i !== index)
    if (updatedConditions.length === 1) {
      // If only one condition left, unwrap from AND/OR
      emit('update', props.rule.id, { when: updatedConditions[0] })
    } else if (updatedConditions.length > 1) {
      const newWhen: AndCondition | OrCondition = {
        type: props.rule.when.type,
        conditions: updatedConditions,
      }
      emit('update', props.rule.id, { when: newWhen })
    } else {
      // No conditions left - this shouldn't happen, but handle it
      // Create a default condition
      const defaultCondition: ScheduleCondition = {
        type: 'schedule',
        frequency: 'weekly',
        dayOfWeek: 'monday',
      }
      emit('update', props.rule.id, { when: defaultCondition })
    }
  }
}

const removeSingleCondition = () => {
  // Replace with a default condition (rule needs at least one condition)
  // This allows the user to easily change it to a different type
  const defaultCondition: ScheduleCondition = {
    type: 'schedule',
    frequency: 'weekly',
    dayOfWeek: 'monday',
  }
  // Force update by creating a new object reference
  emit('update', props.rule.id, { when: { ...defaultCondition } })
}

const handleConditionTypeSelected = (type: string) => {
  let newCondition: WhenCondition

  switch (type) {
    case 'schedule':
      newCondition = {
        type: 'schedule',
        frequency: 'weekly',
        dayOfWeek: 'monday',
      } as ScheduleCondition
      break
    case 'price_change':
      newCondition = {
        type: 'price_change',
        direction: 'drop',
        threshold: 0.1,
        referencePoint: '7d_high',
      } as PriceChangeCondition
      break
    case 'price_level':
      newCondition = {
        type: 'price_level',
        operator: 'below',
        price: 50000,
      } as PriceLevelCondition
      break
    case 'price_streak':
      newCondition = {
        type: 'price_streak',
        direction: 'drop',
        streakCount: 3,
      } as PriceStreakCondition
      break
    case 'volume_change':
      newCondition = {
        type: 'volume_change',
        operator: 'above',
        threshold: 1.5,
        lookbackDays: 7,
      } as VolumeChangeCondition
      break
    case 'indicator':
      newCondition = {
        type: 'indicator',
        indicator: 'rsi',
        params: { period: 14 },
        operator: 'less_than',
        value: 30,
      } as IndicatorCondition
      break
    default:
      return
  }

  // If we already have conditions, add to existing AND/OR
  if (props.rule.when.type === 'and' || props.rule.when.type === 'or') {
    const newWhen: AndCondition | OrCondition = {
      type: props.rule.when.type,
      conditions: [...props.rule.when.conditions, newCondition],
    }
    emit('update', props.rule.id, { when: newWhen })
  } else {
    // First condition becomes AND with new condition (default to AND)
    const newWhen: AndCondition = {
      type: 'and',
      conditions: [props.rule.when, newCondition],
    }
    emit('update', props.rule.id, { when: newWhen })
  }
}

const handleActionUpdate = (index: number, action: ThenAction) => {
  const updatedActions = [...props.rule.then]
  updatedActions[index] = action
  emit('update', props.rule.id, { then: updatedActions })
}

const removeAction = (index: number) => {
  const updatedActions = props.rule.then.filter((_, i) => i !== index)
  emit('update', props.rule.id, { then: updatedActions })
}

const handleActionTypeSelected = (type: string) => {
  let newAction: ThenAction

  switch (type) {
    case 'buy_fixed':
      newAction = {
        type: 'buy_fixed',
        amount: 100,
      } as BuyFixedAction
      break
    case 'buy_percentage':
      newAction = {
        type: 'buy_percentage',
        percentage: 0.5,
      } as BuyPercentageAction
      break
    case 'buy_scaled':
      newAction = {
        type: 'buy_scaled',
        baseAmount: 100,
        scaleFactor: 2.0,
      } as BuyScaledAction
      break
    case 'sell_fixed':
      newAction = {
        type: 'sell_fixed',
        amount: 100,
      } as SellFixedAction
      break
    case 'sell_percentage':
      newAction = {
        type: 'sell_percentage',
        percentage: 0.5,
      } as SellPercentageAction
      break
    case 'rebalance':
      newAction = {
        type: 'rebalance',
        targetAllocation: 0.8,
        threshold: 0.05,
      } as RebalanceAction
      break
    case 'limit_order':
      newAction = {
        type: 'limit_order',
        price: 50000,
        amount: 100,
      } as LimitOrderAction
      break
    default:
      return
  }

  const updatedActions = [...props.rule.then, newAction]
  emit('update', props.rule.id, { then: updatedActions })
}

const handleDelete = () => {
  emit('delete', props.rule.id)
}
</script>

<style scoped>
.rule-block {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 16px;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.rule-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.section {
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #595959;
}

.action-item {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.condition-item {
  margin-bottom: 8px;
}

.condition-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logic-separator {
  text-align: center;
  padding: 8px;
  font-weight: 600;
  color: #1890ff;
  background: #e6f7ff;
  border-radius: 4px;
  margin: 4px 0;
}

.conditions-list {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.logic-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logic-label {
  font-size: 12px;
  color: #595959;
}
</style>

