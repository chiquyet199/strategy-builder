<template>
  <div class="action-block">
    <!-- Buy Fixed Amount -->
    <div v-if="action.type === 'buy_fixed'" class="action-display">
      <span class="action-text">
        Buy
        <a-input-number
          v-model:value="buyAmount"
          :min="0.01"
          :step="10"
          :formatter="(value) => `$${value}`"
          :parser="(value) => value.replace('$', '')"
          style="width: 120px"
          @change="handleBuyFixedUpdate"
        />
        of BTC
      </span>
    </div>

    <!-- Buy Percentage -->
    <div v-else-if="action.type === 'buy_percentage'" class="action-display">
      <span class="action-text">
        Buy
        <a-input-number
          v-model:value="buyPercentage"
          :min="1"
          :max="100"
          :formatter="(value) => `${value}%`"
          :parser="(value) => value.replace('%', '')"
          style="width: 100px"
          @change="handleBuyPercentageUpdate"
        />
        of available cash
      </span>
    </div>

    <!-- Buy Scaled -->
    <div v-else-if="action.type === 'buy_scaled'" class="action-display">
      <span class="action-text">
        Buy scaled amount: Base $
        <a-input-number
          v-model:value="scaledBaseAmount"
          :min="0.01"
          :step="10"
          style="width: 120px"
          @change="handleBuyScaledUpdate"
        />
        ×
        <a-input-number
          v-model:value="scaledFactor"
          :min="0.1"
          :step="0.1"
          style="width: 80px"
          @change="handleBuyScaledUpdate"
        />
        <template v-if="scaledMaxAmount">
          (max: $
          <a-input-number
            v-model:value="scaledMaxAmount"
            :min="scaledBaseAmount"
            :step="100"
            style="width: 120px"
            @change="handleBuyScaledUpdate"
          />)
        </template>
      </span>
    </div>

    <!-- Rebalance -->
    <div v-else-if="action.type === 'rebalance'" class="action-display">
      <span class="action-text">
        Rebalance to
        <a-input-number
          v-model:value="rebalanceTarget"
          :min="0"
          :max="100"
          :formatter="(value) => `${value}%`"
          :parser="(value) => value.replace('%', '')"
          style="width: 100px"
          @change="handleRebalanceUpdate"
        />
        BTC allocation
        <template v-if="rebalanceThreshold !== undefined">
          (threshold:
          <a-input-number
            v-model:value="rebalanceThreshold"
            :min="0"
            :max="100"
            :formatter="(value) => `${value}%`"
            :parser="(value) => value.replace('%', '')"
            style="width: 80px"
            @change="handleRebalanceUpdate"
          />)
        </template>
      </span>
    </div>

    <!-- Sell Fixed Amount -->
    <div v-else-if="action.type === 'sell_fixed'" class="action-display">
      <span class="action-text">
        Sell
        <a-input-number
          v-model:value="sellAmount"
          :min="0.01"
          :step="10"
          :formatter="(value) => `$${value}`"
          :parser="(value) => value.replace('$', '')"
          style="width: 120px"
          @change="handleSellFixedUpdate"
        />
        worth of BTC
      </span>
    </div>

    <!-- Sell Percentage -->
    <div v-else-if="action.type === 'sell_percentage'" class="action-display">
      <span class="action-text">
        Sell
        <a-input-number
          v-model:value="sellPercentage"
          :min="1"
          :max="100"
          :formatter="(value) => `${value}%`"
          :parser="(value) => value.replace('%', '')"
          style="width: 100px"
          @change="handleSellPercentageUpdate"
        />
        of BTC holdings
      </span>
    </div>

    <!-- Limit Order -->
    <div v-else-if="action.type === 'limit_order'" class="action-display">
      <span class="action-text">
        Limit order: Buy $
        <a-input-number
          v-model:value="limitAmount"
          :min="0.01"
          :step="10"
          style="width: 120px"
          @change="handleLimitOrderUpdate"
        />
        at $
        <a-input-number
          v-model:value="limitPrice"
          :min="0"
          :step="1000"
          style="width: 150px"
          @change="handleLimitOrderUpdate"
        />
        <template v-if="limitExpires !== undefined">
          (expires in
          <a-input-number
            v-model:value="limitExpires"
            :min="1"
            :max="365"
            style="width: 60px"
            @change="handleLimitOrderUpdate"
          />
          days)
        </template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { InputNumber as AInputNumber } from 'ant-design-vue'
import type {
  ThenAction,
  BuyFixedAction,
  BuyPercentageAction,
  BuyScaledAction,
  SellFixedAction,
  SellPercentageAction,
  RebalanceAction,
  LimitOrderAction,
} from '../api/strategyBuilderApi'

interface Props {
  action: ThenAction
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [action: ThenAction]
}>()

const buyAmount = ref<number>(100)
const buyPercentage = ref<number>(50)
const scaledBaseAmount = ref<number>(100)
const scaledFactor = ref<number>(2.0)
const scaledMaxAmount = ref<number | undefined>(undefined)
const sellAmount = ref<number>(100)
const sellPercentage = ref<number>(50)
const rebalanceTarget = ref<number>(80)
const rebalanceThreshold = ref<number | undefined>(5)
const limitAmount = ref<number>(100)
const limitPrice = ref<number>(50000)
const limitExpires = ref<number | undefined>(undefined)

onMounted(() => {
  if (props.action.type === 'buy_fixed') {
    buyAmount.value = props.action.amount
  } else if (props.action.type === 'buy_percentage') {
    buyPercentage.value = props.action.percentage * 100 // Convert to percentage
  } else if (props.action.type === 'buy_scaled') {
    scaledBaseAmount.value = props.action.baseAmount
    scaledFactor.value = props.action.scaleFactor
    scaledMaxAmount.value = props.action.maxAmount
  } else if (props.action.type === 'sell_fixed') {
    sellAmount.value = props.action.amount
  } else if (props.action.type === 'sell_percentage') {
    sellPercentage.value = props.action.percentage * 100 // Convert to percentage
  } else if (props.action.type === 'rebalance') {
    rebalanceTarget.value = props.action.targetAllocation * 100 // Convert to percentage
    rebalanceThreshold.value = props.action.threshold
      ? props.action.threshold * 100
      : undefined
  } else if (props.action.type === 'limit_order') {
    limitAmount.value = props.action.amount
    limitPrice.value = props.action.price
    limitExpires.value = props.action.expiresInDays
  }
})

const handleBuyFixedUpdate = () => {
  const updated: BuyFixedAction = {
    type: 'buy_fixed',
    amount: buyAmount.value,
  }
  emit('update', updated)
}

const handleBuyPercentageUpdate = () => {
  const updated: BuyPercentageAction = {
    type: 'buy_percentage',
    percentage: buyPercentage.value / 100, // Convert from percentage
  }
  emit('update', updated)
}

const handleBuyScaledUpdate = () => {
  const updated: BuyScaledAction = {
    type: 'buy_scaled',
    baseAmount: scaledBaseAmount.value,
    scaleFactor: scaledFactor.value,
    maxAmount: scaledMaxAmount.value,
  }
  emit('update', updated)
}

const handleSellFixedUpdate = () => {
  const updated: SellFixedAction = {
    type: 'sell_fixed',
    amount: sellAmount.value,
  }
  emit('update', updated)
}

const handleSellPercentageUpdate = () => {
  const updated: SellPercentageAction = {
    type: 'sell_percentage',
    percentage: sellPercentage.value / 100, // Convert from percentage
  }
  emit('update', updated)
}

const handleRebalanceUpdate = () => {
  const updated: RebalanceAction = {
    type: 'rebalance',
    targetAllocation: rebalanceTarget.value / 100, // Convert from percentage
    threshold: rebalanceThreshold.value ? rebalanceThreshold.value / 100 : undefined,
  }
  emit('update', updated)
}

const handleLimitOrderUpdate = () => {
  const updated: LimitOrderAction = {
    type: 'limit_order',
    price: limitPrice.value,
    amount: limitAmount.value,
    expiresInDays: limitExpires.value,
  }
  emit('update', updated)
}
</script>

<style scoped>
.action-block {
  padding: 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.action-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-text {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

