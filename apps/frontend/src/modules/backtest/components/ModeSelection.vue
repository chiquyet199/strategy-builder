<template>
  <a-radio-group v-model:value="selectedMode" @change="handleModeChange" button-style="solid">
    <a-radio-button value="compare-strategies">
      {{ t('backtest.mode.compareStrategies') }}
    </a-radio-button>
    <a-radio-button value="compare-variants">
      {{ t('backtest.mode.compareVariants') }}
    </a-radio-button>
  </a-radio-group>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ComparisonMode } from '@/shared/types/backtest'

interface Props {
  modelValue: ComparisonMode
}

interface Emits {
  (e: 'update:modelValue', value: ComparisonMode): void
}

const { t } = useI18n()
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedMode = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function handleModeChange() {
  emit('update:modelValue', selectedMode.value)
}
</script>

<style scoped>
.ant-radio-group {
  width: 100%;
}

.ant-radio-button-wrapper {
  flex: 1;
  text-align: center;
}
</style>
