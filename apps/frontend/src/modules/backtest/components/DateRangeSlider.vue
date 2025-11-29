<template>
  <div class="date-range-slider">
    <a-slider
      v-model:value="dateRange.indices"
      range
      :min="0"
      :max="totalMonths"
      :step="1"
      :marks="sliderMarks"
      :tooltip="{ formatter: (value) => formatMonthTooltip(value as number) }"
      @change="handleDateRangeChange"
    />
    <div class="date-range-display">
      <span><strong>{{ t('backtest.dateRangeStart') }}:</strong> {{ formatDateDisplay(dateRange.startDate, false) }}</span>
      <span><strong>{{ t('backtest.dateRangeEnd') }}:</strong> {{ formatDateDisplay(dateRange.endDate, true) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDateRange } from '../composables/useDateRange'

const { t } = useI18n()

interface Props {
  initialStartDate?: string
  initialEndDate?: string
}

interface Emits {
  (e: 'change', value: { startDate: string; endDate: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const {
  totalMonths,
  dateRange,
  sliderMarks,
  formatMonthTooltip,
  formatDateDisplay,
  handleDateRangeChange: handleChange,
  getDateRangeISO,
} = useDateRange(props.initialStartDate, props.initialEndDate)

function handleDateRangeChange(values: [number, number]) {
  handleChange(values)
  const isoDates = getDateRangeISO()
  emit('change', isoDates)
}
</script>

<style scoped>
.date-range-slider {
  padding: 16px 0;
}

.date-range-display {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.date-range-display span {
  font-size: 14px;
}

.date-range-display strong {
  margin-right: 8px;
}
</style>

