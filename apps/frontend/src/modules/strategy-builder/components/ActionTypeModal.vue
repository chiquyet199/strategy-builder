<template>
  <a-modal
    v-model:open="visible"
    title="Add Action"
    :z-index="1003"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="action-type-selector">
      <h4 class="mb-4">Choose action type:</h4>
      
      <a-radio-group v-model:value="selectedType" class="w-full">
        <div class="action-option mb-3">
          <a-radio value="buy_fixed">
            <strong>💰 Buy Fixed Amount</strong>
            <div class="text-sm text-gray-500">Purchase specific USD amount</div>
          </a-radio>
        </div>
        
        <div class="action-option mb-3">
          <a-radio value="buy_percentage">
            <strong>📊 Buy Percentage</strong>
            <div class="text-sm text-gray-500">Invest X% of available cash</div>
          </a-radio>
        </div>
        
        <div class="action-option mb-3">
          <a-radio value="buy_scaled">
            <strong>⚡ Buy Scaled Amount</strong>
            <div class="text-sm text-gray-500">Amount scales with condition severity</div>
          </a-radio>
        </div>
        
        <div class="action-option mb-3">
          <a-radio value="sell_fixed">
            <strong>💸 Sell Fixed Amount</strong>
            <div class="text-sm text-gray-500">Sell specific USD value of BTC</div>
          </a-radio>
        </div>
        
        <div class="action-option mb-3">
          <a-radio value="sell_percentage">
            <strong>📉 Sell Percentage</strong>
            <div class="text-sm text-gray-500">Sell X% of BTC holdings</div>
          </a-radio>
        </div>
        
        <div class="action-option mb-3">
          <a-radio value="take_profit">
            <strong>💰 Take Profit</strong>
            <div class="text-sm text-gray-500">Sell X% of holdings and track profit separately</div>
          </a-radio>
        </div>
        
        <div class="action-option mb-3">
          <a-radio value="rebalance">
            <strong>🔄 Rebalance Portfolio</strong>
            <div class="text-sm text-gray-500">Maintain target allocation</div>
          </a-radio>
        </div>
        
        <div class="action-option mb-3">
          <a-radio value="limit_order">
            <strong>🎯 Limit Order</strong>
            <div class="text-sm text-gray-500">Buy order at specific price</div>
          </a-radio>
        </div>
      </a-radio-group>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Modal as AModal, RadioGroup as ARadioGroup, Radio as ARadio } from 'ant-design-vue'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [type: string]
}>()

const visible = ref(props.open)
const selectedType = ref<string>('buy_fixed')

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
.action-option {
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: pointer;
}

.action-option:hover {
  background: #f5f5f5;
}
</style>

