<template>
  <a-radio-group v-model:value="selectedMode" button-style="solid">
    <a-radio-button value="compare-strategies">
      {{ t('backtest.mode.compareStrategies') }}
    </a-radio-button>
    <a-radio-button value="compare-variants">
      {{ t('backtest.mode.compareVariants') }}
    </a-radio-button>
  </a-radio-group>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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

const selectedMode = ref<ComparisonMode>(props.modelValue)

// Sync with prop changes (from parent)
watch(
  () => props.modelValue,
  (newValue) => {
    if (selectedMode.value !== newValue) {
      selectedMode.value = newValue
    }
  },
)

// Emit changes to parent (from user interaction)
watch(selectedMode, (newValue) => {
  if (props.modelValue !== newValue) {
    emit('update:modelValue', newValue)
  }
})
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
