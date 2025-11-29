import { computed, reactive } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'

const START_DATE = dayjs('2020-01-01').startOf('month')
const END_DATE = dayjs().startOf('month')

export function useDateRange(initialStartDate?: string, initialEndDate?: string) {
  const totalMonths = END_DATE.diff(START_DATE, 'month')

  // Convert date to month index (0-based)
  function dateToMonthIndex(date: Dayjs): number {
    return date.diff(START_DATE, 'month')
  }

  // Convert month index to date
  function monthIndexToDate(monthIndex: number): Dayjs {
    return START_DATE.add(monthIndex, 'month')
  }

  // Initialize date range
  const initialStart = initialStartDate
    ? dayjs(initialStartDate).startOf('month')
    : START_DATE
  const initialEnd = initialEndDate
    ? dayjs(initialEndDate).startOf('month')
    : END_DATE

  const initialStartIndex = dateToMonthIndex(initialStart)
  const initialEndIndex = Math.min(dateToMonthIndex(initialEnd), totalMonths)

  const dateRange = reactive({
    indices: [initialStartIndex, initialEndIndex] as [number, number],
    startDate: monthIndexToDate(initialStartIndex).startOf('month'),
    endDate: monthIndexToDate(initialEndIndex).endOf('month'),
  })

  // Create marks for slider (show years)
  const sliderMarks = computed(() => {
    const marks: Record<number, string> = {}
    let current = START_DATE.clone()
    while (current.isBefore(END_DATE) || current.isSame(END_DATE, 'month')) {
      const monthIndex = dateToMonthIndex(current)
      // Show mark for January of each year
      if (current.month() === 0) {
        marks[monthIndex] = current.format('YYYY')
      }
      current = current.add(1, 'month')
    }
    // Always show the last month
    marks[totalMonths] = END_DATE.format('YYYY')
    return marks
  })

  // Format month from index for tooltip
  function formatMonthTooltip(monthIndex: number): string {
    const date = monthIndexToDate(monthIndex)
    return date.format('MMM YYYY')
  }

  // Format date for display
  function formatDateDisplay(date: Dayjs, isEnd: boolean = false): string {
    if (isEnd) {
      return date.endOf('month').format('DD-MM-YYYY')
    }
    return date.startOf('month').format('DD-MM-YYYY')
  }

  // Handle date range change from slider
  function handleDateRangeChange(values: [number, number]) {
    dateRange.indices = values
    dateRange.startDate = monthIndexToDate(values[0]).startOf('month')
    dateRange.endDate = monthIndexToDate(values[1]).endOf('month')
  }

  // Get ISO strings for backend
  function getDateRangeISO() {
    return {
      startDate: dateRange.startDate.startOf('day').toISOString(),
      endDate: dateRange.endDate.endOf('day').toISOString(),
    }
  }

  return {
    totalMonths,
    dateRange,
    sliderMarks,
    formatMonthTooltip,
    formatDateDisplay,
    handleDateRangeChange,
    getDateRangeISO,
  }
}

