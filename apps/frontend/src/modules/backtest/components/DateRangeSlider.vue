<template>
  <div class="date-range-slider">
    <a-slider
      v-model:value="dateRange.indices"
      range
      :min="0"
      :max="totalMonths"
      :step="1"
      :marks="sliderMarks"
      :tooltip="{ formatter: tooltipFormatter }"
      @change="handleDateRangeChange"
    />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import dayjs from 'dayjs'
import { useDateRange } from '../composables/useDateRange'

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
  handleDateRangeChange: handleChange,
  getDateRangeISO,
} = useDateRange(props.initialStartDate, props.initialEndDate)

// Tooltip formatter function
const tooltipFormatter = (value?: number | string): string => {
  return formatMonthTooltip(Number(value) || 0)
}

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

/**
 * Programmatically set the date range (for external control)
 */
function setRange(startDate: string, endDate: string) {
  const START_DATE = dayjs('2020-01-01').startOf('month')
  
  const startMonth = dayjs(startDate).startOf('month')
  const endMonth = dayjs(endDate).startOf('month')
  
  const startIndex = Math.max(0, startMonth.diff(START_DATE, 'month'))
  const endIndex = Math.min(endMonth.diff(START_DATE, 'month'), totalMonths)
  
  dateRange.indices = [startIndex, endIndex]
  dateRange.startDate = startMonth.startOf('month')
  dateRange.endDate = endMonth.endOf('month')
}

// Expose setRange for parent components
defineExpose({
  setRange,
})
</script>

<style scoped>
.date-range-slider {
  padding: 8px 0;
}

</style>

