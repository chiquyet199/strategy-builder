<template>
  <a-checkbox-group v-model:value="selectedStrategies" style="width: 100%">
    <a-row>
      <a-col :span="12" v-for="strategy in availableStrategies" :key="strategy.id">
        <a-checkbox :value="strategy.id">{{ strategy.name }}</a-checkbox>
      </a-col>
    </a-row>
  </a-checkbox-group>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface StrategyMetadata {
  id: string
  name: string
}

interface Props {
  modelValue: string[]
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const availableStrategies: StrategyMetadata[] = [
  { id: 'lump-sum', name: 'Lump Sum' },
  { id: 'weekly-dca', name: 'Weekly DCA' },
  { id: 'monthly-dca', name: 'Monthly DCA' },
  { id: 'rsi-dca', name: 'RSI DCA' },
  { id: 'dip-buyer-dca', name: 'Dip Buyer DCA' },
  { id: 'moving-average-dca', name: 'Moving Average DCA' },
  { id: 'combined-smart-dca', name: 'Combined Smart DCA' },
]

const selectedStrategies = computed({
  get: () => props.modelValue,
  set: (value: string[]) => {
    emit('update:modelValue', value)
  },
})
</script>

