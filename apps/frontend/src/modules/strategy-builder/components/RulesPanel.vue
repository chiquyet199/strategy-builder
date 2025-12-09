<template>
  <div class="rules-panel-container">
    <!-- Strategy Name -->
    <div class="panel-section">
      <label class="section-label">Strategy Name</label>
      <a-input
        :value="strategyName"
        placeholder="My Custom Strategy"
        @update:value="$emit('update:strategy-name', $event)"
      />
    </div>

    <!-- Rules List -->
    <div class="panel-section rules-section">
      <div class="section-header">
        <label class="section-label">Rules</label>
        <span class="rules-count">{{ rules.length }}</span>
      </div>

      <div class="rules-list">
        <RuleCard
          v-for="(rule, index) in rules"
          :key="rule.id"
          :rule="rule"
          :rule-number="index + 1"
          :color="ruleColors.get(rule.id) || '#666'"
          :trigger-count="getTriggerCount(rule.id)"
          :is-expanded="expandedRuleId === rule.id"
          @toggle="toggleRule(rule.id)"
          @update="(updated) => $emit('update-rule', rule.id, updated)"
          @delete="$emit('delete-rule', rule.id)"
        />
      </div>

      <a-button type="dashed" block class="add-rule-btn" @click="$emit('add-rule')">
        <template #icon><PlusOutlined /></template>
        Add Rule
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Input as AInput, Button as AButton } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import RuleCard from './RuleCard.vue'
import type { CustomRule, RuleTriggerSummary } from '../api/strategyBuilderApi'

interface Props {
  strategyName: string
  rules: CustomRule[]
  ruleTriggers: Map<string, RuleTriggerSummary>
  ruleColors: Map<string, string>
}

const props = defineProps<Props>()

defineEmits<{
  'update:strategy-name': [name: string]
  'add-rule': []
  'update-rule': [ruleId: string, updated: Partial<CustomRule>]
  'delete-rule': [ruleId: string]
}>()

const expandedRuleId = ref<string | null>(null)

function toggleRule(ruleId: string) {
  expandedRuleId.value = expandedRuleId.value === ruleId ? null : ruleId
}

function getTriggerCount(ruleId: string): number {
  return props.ruleTriggers.get(ruleId)?.triggerCount || 0
}
</script>

<style scoped>
.rules-panel-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-section {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.section-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.rules-count {
  background: #f0f0f0;
  color: #666;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.rules-section {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.rules-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
}

.add-rule-btn {
  margin-top: auto;
}
</style>
