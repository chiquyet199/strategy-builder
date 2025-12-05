<template>
  <div class="condition-block">
    <!-- Schedule Condition -->
    <div v-if="condition.type === 'schedule'" class="condition-display">
      <span class="condition-text">
        Every
        <a-select
          v-model:value="scheduleFrequency"
          style="width: 100px"
          @change="handleScheduleUpdate"
        >
          <a-select-option value="daily">day</a-select-option>
          <a-select-option value="weekly">week</a-select-option>
          <a-select-option value="monthly">month</a-select-option>
        </a-select>
        <template v-if="scheduleFrequency === 'weekly'">
          on
          <a-select
            v-model:value="dayOfWeek"
            style="width: 120px"
            @change="handleScheduleUpdate"
          >
            <a-select-option value="monday">Monday</a-select-option>
            <a-select-option value="tuesday">Tuesday</a-select-option>
            <a-select-option value="wednesday">Wednesday</a-select-option>
            <a-select-option value="thursday">Thursday</a-select-option>
            <a-select-option value="friday">Friday</a-select-option>
            <a-select-option value="saturday">Saturday</a-select-option>
            <a-select-option value="sunday">Sunday</a-select-option>
          </a-select>
        </template>
        <template v-if="scheduleFrequency === 'monthly'">
          on day
          <a-input-number
            v-model:value="dayOfMonth"
            :min="1"
            :max="28"
            style="width: 80px"
            @change="handleScheduleUpdate"
          />
        </template>
      </span>
    </div>

    <!-- Price Change Condition -->
    <div v-else-if="condition.type === 'price_change'" class="condition-display">
      <span class="condition-text">
        Price
        <a-select
          v-model:value="priceDirection"
          style="width: 100px"
          @change="handlePriceChangeUpdate"
        >
          <a-select-option value="drop">drops</a-select-option>
          <a-select-option value="rise">rises</a-select-option>
        </a-select>
        <a-input-number
          v-model:value="priceThreshold"
          :min="0"
          :max="100"
          :formatter="(value) => `${value}%`"
          :parser="(value) => value.replace('%', '')"
          style="width: 100px"
          @change="handlePriceChangeUpdate"
        />
        from
        <a-select
          v-model:value="referencePoint"
          style="width: 120px"
          @change="handlePriceChangeUpdate"
        >
          <a-select-option value="24h_high">24h high</a-select-option>
          <a-select-option value="7d_high">7-day high</a-select-option>
          <a-select-option value="30d_high">30-day high</a-select-option>
          <a-select-option value="ath">All-time high</a-select-option>
        </a-select>
      </span>
    </div>

    <!-- Price Level Condition -->
    <div v-else-if="condition.type === 'price_level'" class="condition-display">
      <span class="condition-text">
        Price is
        <a-select
          v-model:value="priceLevelOperator"
          style="width: 100px"
          @change="handlePriceLevelUpdate"
        >
          <a-select-option value="above">above</a-select-option>
          <a-select-option value="below">below</a-select-option>
          <a-select-option value="equals">equals</a-select-option>
        </a-select>
        <a-input-number
          v-model:value="priceLevel"
          :min="0"
          :step="1000"
          :formatter="(value) => `$${value}`"
          :parser="(value) => value.replace('$', '')"
          style="width: 150px"
          @change="handlePriceLevelUpdate"
        />
      </span>
    </div>

    <!-- Price Streak Condition -->
    <div v-else-if="condition.type === 'price_streak'" class="condition-display">
      <span class="condition-text">
        Price
        <a-select
          v-model:value="priceStreakDirection"
          style="width: 100px"
          @change="handlePriceStreakUpdate"
        >
          <a-select-option value="drop">drops</a-select-option>
          <a-select-option value="rise">rises</a-select-option>
        </a-select>
        <a-input-number
          v-model:value="priceStreakCount"
          :min="2"
          :max="30"
          :step="1"
          style="width: 80px"
          @change="handlePriceStreakUpdate"
        />
        times in a row
        <span class="text-gray-500 ml-2">(optional min change:</span>
        <a-input-number
          v-model:value="priceStreakMinChange"
          :min="0"
          :max="100"
          :step="0.1"
          :formatter="(value) => value ? `${value}%` : ''"
          :parser="(value) => value.replace('%', '')"
          style="width: 80px"
          placeholder="0%"
          @change="handlePriceStreakUpdate"
        />
        <span class="text-gray-500">)</span>
      </span>
    </div>

    <!-- Portfolio Value Condition -->
    <div v-else-if="condition.type === 'portfolio_value'" class="condition-display">
      <span class="condition-text">
        Portfolio value
        <a-select
          v-model:value="portfolioValueMode"
          style="width: 120px"
          @change="handlePortfolioValueUpdate"
        >
          <a-select-option value="absolute">is</a-select-option>
          <a-select-option value="percentage">return is</a-select-option>
        </a-select>
        <a-select
          v-model:value="portfolioValueOperator"
          style="width: 100px"
          @change="handlePortfolioValueUpdate"
        >
          <a-select-option value="above">above</a-select-option>
          <a-select-option value="below">below</a-select-option>
          <a-select-option value="equals">equals</a-select-option>
          <a-select-option value="reaches">reaches</a-select-option>
        </a-select>
        <template v-if="portfolioValueMode === 'absolute'">
          <a-input-number
            v-model:value="portfolioValueTarget"
            :min="0.01"
            :step="100"
            :formatter="(value) => `$${value}`"
            :parser="(value) => value.replace('$', '')"
            style="width: 150px"
            @change="handlePortfolioValueUpdate"
          />
        </template>
        <template v-else>
          <a-input-number
            v-model:value="portfolioValueTargetPercent"
            :min="0"
            :max="1000"
            :step="1"
            :formatter="(value) => `${value}%`"
            :parser="(value) => value.replace('%', '')"
            style="width: 100px"
            @change="handlePortfolioValueUpdate"
          />
          <span class="text-gray-500 ml-2">(from</span>
          <a-select
            v-model:value="portfolioValueReference"
            style="width: 140px"
            @change="handlePortfolioValueUpdate"
          >
            <a-select-option value="initial_investment">initial investment</a-select-option>
            <a-select-option value="total_invested">total invested</a-select-option>
            <a-select-option value="peak_value">peak value</a-select-option>
          </a-select>
          <span class="text-gray-500">)</span>
        </template>
      </span>
    </div>

    <!-- Volume Change Condition -->
    <div v-else-if="condition.type === 'volume_change'" class="condition-display">
      <span class="condition-text">
        Volume is
        <a-select
          v-model:value="volumeOperator"
          style="width: 100px"
          @change="handleVolumeChangeUpdate"
        >
          <a-select-option value="above">above</a-select-option>
          <a-select-option value="below">below</a-select-option>
        </a-select>
        <a-input-number
          v-model:value="volumeThreshold"
          :min="0.1"
          :step="0.1"
          :formatter="(value) => `${value}x`"
          :parser="(value) => value.replace('x', '')"
          style="width: 100px"
          @change="handleVolumeChangeUpdate"
        />
        of
        <a-input-number
          v-model:value="volumeLookback"
          :min="1"
          :max="365"
          style="width: 80px"
          @change="handleVolumeChangeUpdate"
        />
        day average
      </span>
    </div>

    <!-- Indicator Condition -->
    <div v-else-if="condition.type === 'indicator'" class="condition-display">
      <span class="condition-text">
        <a-select
          v-model:value="indicatorType"
          style="width: 120px"
          @change="handleIndicatorUpdate"
        >
          <a-select-option value="rsi">RSI</a-select-option>
          <a-select-option value="ma">Moving Average</a-select-option>
        </a-select>
        <template v-if="indicatorType === 'rsi'">
          (<a-input-number
            v-model:value="rsiPeriod"
            :min="2"
            :max="50"
            style="width: 60px"
            @change="handleIndicatorUpdate"
          />)
        </template>
        <template v-else-if="indicatorType === 'ma'">
          (<a-input-number
            v-model:value="maPeriod"
            :min="2"
            :max="500"
            style="width: 60px"
            @change="handleIndicatorUpdate"
          />)
        </template>
        <a-select
          v-model:value="indicatorOperator"
          style="width: 120px"
          @change="handleIndicatorUpdate"
        >
          <a-select-option value="less_than">&lt;</a-select-option>
          <a-select-option value="greater_than">&gt;</a-select-option>
          <a-select-option value="equals">=</a-select-option>
        </a-select>
        <a-input-number
          v-model:value="indicatorValue"
          :min="0"
          style="width: 100px"
          @change="handleIndicatorUpdate"
        />
      </span>
    </div>

    <!-- AND/OR Conditions -->
    <div v-else-if="condition.type === 'and' || condition.type === 'or'" class="condition-display">
      <span class="condition-text">{{ condition.type.toUpperCase() }} conditions (Phase 2)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Select as ASelect, SelectOption as ASelectOption, InputNumber as AInputNumber } from 'ant-design-vue'
import type {
  WhenCondition,
  ScheduleCondition,
  PriceChangeCondition,
  PriceLevelCondition,
  PriceStreakCondition,
  PortfolioValueCondition,
  VolumeChangeCondition,
  IndicatorCondition,
} from '../api/strategyBuilderApi'

interface Props {
  condition: WhenCondition
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [condition: WhenCondition]
}>()

// Schedule condition state
const scheduleFrequency = ref<'daily' | 'weekly' | 'monthly'>('weekly')
const dayOfWeek = ref<string>('monday')
const dayOfMonth = ref<number>(1)

// Price change condition state
const priceDirection = ref<'drop' | 'rise'>('drop')
const priceThreshold = ref<number>(10)
const referencePoint = ref<'24h_high' | '7d_high' | '30d_high' | 'ath'>('7d_high')

// Price level condition state
const priceLevelOperator = ref<'above' | 'below' | 'equals'>('below')
const priceLevel = ref<number>(50000)

// Price streak condition state
const priceStreakDirection = ref<'drop' | 'rise'>('drop')
const priceStreakCount = ref<number>(3)
const priceStreakMinChange = ref<number | undefined>(undefined)

// Portfolio value condition state
const portfolioValueMode = ref<'absolute' | 'percentage'>('percentage')
const portfolioValueOperator = ref<'above' | 'below' | 'equals' | 'reaches'>('reaches')
const portfolioValueTarget = ref<number>(10000)
const portfolioValueTargetPercent = ref<number>(50)
const portfolioValueReference = ref<'initial_investment' | 'total_invested' | 'peak_value'>('initial_investment')

// Volume change condition state
const volumeOperator = ref<'above' | 'below'>('above')
const volumeThreshold = ref<number>(1.5)
const volumeLookback = ref<number>(7)

// Indicator condition state
const indicatorType = ref<'rsi' | 'ma' | 'macd' | 'bollinger'>('rsi')
const rsiPeriod = ref<number>(14)
const maPeriod = ref<number>(50)
const indicatorOperator = ref<'less_than' | 'greater_than' | 'equals'>('less_than')
const indicatorValue = ref<number>(30)

onMounted(() => {
  // Initialize from props
  if (props.condition.type === 'schedule') {
    scheduleFrequency.value = props.condition.frequency
    dayOfWeek.value = props.condition.dayOfWeek || 'monday'
    dayOfMonth.value = props.condition.dayOfMonth || 1
  } else if (props.condition.type === 'price_change') {
    priceDirection.value = props.condition.direction
    priceThreshold.value = props.condition.threshold * 100 // Convert to percentage
    referencePoint.value = props.condition.referencePoint
  } else if (props.condition.type === 'price_level') {
    priceLevelOperator.value = props.condition.operator
    priceLevel.value = props.condition.price
  } else if (props.condition.type === 'price_streak') {
    priceStreakDirection.value = props.condition.direction
    priceStreakCount.value = props.condition.streakCount
    priceStreakMinChange.value = props.condition.minChangePercent
      ? props.condition.minChangePercent * 100
      : undefined
  } else if (props.condition.type === 'portfolio_value') {
    portfolioValueMode.value = props.condition.mode
    portfolioValueOperator.value = props.condition.operator
    if (props.condition.mode === 'absolute') {
      portfolioValueTarget.value = props.condition.target
    } else {
      portfolioValueTargetPercent.value = props.condition.target * 100 // Convert to percentage
      portfolioValueReference.value = props.condition.referencePoint || 'initial_investment'
    }
  } else if (props.condition.type === 'volume_change') {
    volumeOperator.value = props.condition.operator
    volumeThreshold.value = props.condition.threshold
    volumeLookback.value = props.condition.lookbackDays
  } else if (props.condition.type === 'indicator') {
    indicatorType.value = props.condition.indicator
    indicatorOperator.value = props.condition.operator
    indicatorValue.value = props.condition.value
    if (props.condition.indicator === 'rsi') {
      rsiPeriod.value = props.condition.params?.period || 14
    } else if (props.condition.indicator === 'ma') {
      maPeriod.value = props.condition.params?.period || 50
    }
  }
})

const handleScheduleUpdate = () => {
  const updated: ScheduleCondition = {
    type: 'schedule',
    frequency: scheduleFrequency.value,
  }
  if (scheduleFrequency.value === 'weekly') {
    updated.dayOfWeek = dayOfWeek.value as any
  } else if (scheduleFrequency.value === 'monthly') {
    updated.dayOfMonth = dayOfMonth.value
  }
  emit('update', updated)
}

const handlePriceChangeUpdate = () => {
  const updated: PriceChangeCondition = {
    type: 'price_change',
    direction: priceDirection.value,
    threshold: priceThreshold.value / 100, // Convert from percentage
    referencePoint: referencePoint.value,
  }
  emit('update', updated)
}

const handlePriceLevelUpdate = () => {
  const updated: PriceLevelCondition = {
    type: 'price_level',
    operator: priceLevelOperator.value,
    price: priceLevel.value,
  }
  emit('update', updated)
}

const handlePriceStreakUpdate = () => {
  const updated: PriceStreakCondition = {
    type: 'price_streak',
    direction: priceStreakDirection.value,
    streakCount: priceStreakCount.value,
    minChangePercent: priceStreakMinChange.value
      ? priceStreakMinChange.value / 100
      : undefined,
  }
  emit('update', updated)
}

const handlePortfolioValueUpdate = () => {
  const updated: PortfolioValueCondition = {
    type: 'portfolio_value',
    mode: portfolioValueMode.value,
    operator: portfolioValueOperator.value,
    target: portfolioValueMode.value === 'absolute'
      ? portfolioValueTarget.value
      : portfolioValueTargetPercent.value / 100, // Convert from percentage to 0-1
    referencePoint: portfolioValueMode.value === 'percentage'
      ? portfolioValueReference.value
      : undefined,
  }
  emit('update', updated)
}

const handleVolumeChangeUpdate = () => {
  const updated: VolumeChangeCondition = {
    type: 'volume_change',
    operator: volumeOperator.value,
    threshold: volumeThreshold.value,
    lookbackDays: volumeLookback.value,
  }
  emit('update', updated)
}

const handleIndicatorUpdate = () => {
  const params: Record<string, any> = {}
  if (indicatorType.value === 'rsi') {
    params.period = rsiPeriod.value
  } else if (indicatorType.value === 'ma') {
    params.period = maPeriod.value
  }

  const updated: IndicatorCondition = {
    type: 'indicator',
    indicator: indicatorType.value,
    params,
    operator: indicatorOperator.value,
    value: indicatorValue.value,
  }
  emit('update', updated)
}
</script>

<style scoped>
.condition-block {
  padding: 8px;
  background: white;
  border-radius: 4px;
}

.condition-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.condition-text {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>

