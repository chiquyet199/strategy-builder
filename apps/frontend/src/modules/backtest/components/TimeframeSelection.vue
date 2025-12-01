<template>
  <div class="timeframe-selection">
    <a-radio-group v-model:value="selectedTimeframe" button-style="solid" class="timeframe-radio-group">
      <a-radio-button value="1h" class="timeframe-option">
        {{ t('backtest.form.timeframe.options.1h') }}
      </a-radio-button>
      <a-radio-button value="4h" class="timeframe-option">
        {{ t('backtest.form.timeframe.options.4h') }}
      </a-radio-button>
      <a-radio-button value="1d" class="timeframe-option">
        {{ t('backtest.form.timeframe.options.1d') }}
      </a-radio-button>
      <a-radio-button value="1w" class="timeframe-option">
        {{ t('backtest.form.timeframe.options.1w') }}
      </a-radio-button>
      <a-radio-button value="1m" class="timeframe-option">
        {{ t('backtest.form.timeframe.options.1m') }}
      </a-radio-button>
    </a-radio-group>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Timeframe } from '@/shared/types/backtest'

interface Props {
  modelValue: Timeframe
}

interface Emits {
  (e: 'update:modelValue', value: Timeframe): void
}

const { t } = useI18n()
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedTimeframe = ref<Timeframe>(props.modelValue)

// Sync with prop changes (from parent)
watch(
  () => props.modelValue,
  (newValue) => {
    if (selectedTimeframe.value !== newValue) {
      selectedTimeframe.value = newValue
    }
  },
)

// Emit changes to parent (from user interaction)
watch(selectedTimeframe, (newValue) => {
  if (props.modelValue !== newValue) {
    emit('update:modelValue', newValue)
  }
})
</script>

<style scoped>
.timeframe-selection {
  width: 100%;
}

.timeframe-radio-group {
  width: 100%;
  display: flex;
  gap: 8px;
}

.timeframe-option {
  flex: 1;
  text-align: center;
  height: 40px;
  line-height: 38px;
  border-radius: 6px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .timeframe-radio-group {
    flex-wrap: wrap;
    gap: 6px;
  }

  .timeframe-option {
    flex: 1 1 calc(50% - 3px);
    min-width: calc(50% - 3px);
    height: 36px;
    line-height: 34px;
    font-size: 13px;
  }
}
</style>

