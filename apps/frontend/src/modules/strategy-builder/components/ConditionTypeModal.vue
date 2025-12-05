<template>
  <a-modal
    v-model:open="visible"
    title="Add Condition"
    :z-index="1003"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="condition-type-selector">
      <h4 class="mb-4">Choose condition type:</h4>
      
      <a-radio-group v-model:value="selectedType" class="w-full">
        <div class="condition-option mb-3">
          <a-radio value="schedule">
            <strong>⏰ Time-Based</strong>
            <div class="text-sm text-gray-500">Regular schedule (daily/weekly/monthly)</div>
          </a-radio>
        </div>
        
        <div class="condition-option mb-3">
          <a-radio value="price_change">
            <strong>📉 Price Change</strong>
            <div class="text-sm text-gray-500">Price drops/rises X% from reference point</div>
          </a-radio>
        </div>
        
        <div class="condition-option mb-3">
          <a-radio value="price_level">
            <strong>💰 Price Level</strong>
            <div class="text-sm text-gray-500">Price reaches specific USD level</div>
          </a-radio>
        </div>
        
        <div class="condition-option mb-3">
          <a-radio value="price_streak">
            <strong>📊 Price Streak</strong>
            <div class="text-sm text-gray-500">Price drops/rises N times in a row</div>
          </a-radio>
        </div>
        
        <div class="condition-option mb-3">
          <a-radio value="portfolio_value">
            <strong>💼 Portfolio Value</strong>
            <div class="text-sm text-gray-500">Portfolio reaches target amount or % return</div>
          </a-radio>
        </div>
        
        <div class="condition-option mb-3">
          <a-radio value="volume_change">
            <strong>📊 Volume Change</strong>
            <div class="text-sm text-gray-500">Volume above/below average</div>
          </a-radio>
        </div>
        
        <div class="condition-option mb-3">
          <a-radio value="indicator">
            <strong>📈 Indicator-Based</strong>
            <div class="text-sm text-gray-500">RSI, Moving Average, etc. (Phase 2)</div>
          </a-radio>
        </div>
      </a-radio-group>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Modal as AModal, RadioGroup as ARadioGroup, Radio as ARadio } from 'ant-design-vue'
import type { WhenCondition } from '../api/strategyBuilderApi'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [type: string]
}>()

const visible = ref(props.open)
const selectedType = ref<string>('schedule')

watch(() => props.open, (newVal) => {
  visible.value = newVal
})

watch(visible, (newVal) => {
  emit('update:open', newVal)
})

const handleOk = () => {
  emit('select', selectedType.value)
  visible.value = false
}

const handleCancel = () => {
  visible.value = false
}
</script>

<style scoped>
.condition-option {
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: pointer;
}

.condition-option:hover {
  background: #f5f5f5;
}
</style>

