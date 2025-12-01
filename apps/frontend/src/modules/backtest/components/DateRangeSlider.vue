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
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
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

// Watch for prop changes and update the slider
watch(
  () => [props.initialStartDate, props.initialEndDate],
  ([newStartDate, newEndDate]) => {
    if (newStartDate && newEndDate) {
      const START_DATE = dayjs('2020-01-01').startOf('month')
      
      // Convert dates to month indices
      const startMonth = dayjs(newStartDate).startOf('month')
      const endMonth = dayjs(newEndDate).startOf('month')
      
      const startIndex = startMonth.diff(START_DATE, 'month')
      const endIndex = Math.min(endMonth.diff(START_DATE, 'month'), totalMonths)
      
      // Update the dateRange reactive object
      dateRange.indices = [startIndex, endIndex]
      dateRange.startDate = startMonth.startOf('month')
      dateRange.endDate = endMonth.endOf('month')
    }
  },
  { immediate: false },
)

function handleDateRangeChange(values: [number, number]) {
  handleChange(values)
  const isoDates = getDateRangeISO()
  emit('change', isoDates)
}
</script>

<style scoped>
.date-range-slider {
  padding: 8px 0;
}

.date-range-display {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.date-range-display span {
  font-size: 12px;
}

.date-range-display strong {
  margin-right: 6px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .date-range-slider {
    padding: 6px 0;
  }

  .date-range-display {
    flex-direction: column;
    gap: 4px;
    margin-top: 10px;
    padding: 8px;
  }

  .date-range-display span {
    font-size: 11px;
  }
}
</style>

