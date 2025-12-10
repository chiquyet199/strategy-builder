/**
 * Timeframe-based date range limits
 * 
 * These limits prevent excessive data loading that could cause:
 * - Slow API responses
 * - High memory usage
 * - Poor chart rendering performance
 * 
 * Example: 1h candles over 5 years = 43,800 data points (too many!)
 */

import dayjs from 'dayjs'

export type TimeframeLimitKey = '1h' | '4h' | '1d' | '1w' | '1m'

export interface TimeframeLimit {
  /** Maximum number of months allowed for this timeframe */
  maxMonths: number
  /** Human-readable description */
  description: string
  /** Suggested alternative timeframe if limit is exceeded */
  suggestedTimeframe?: TimeframeLimitKey
  /** Approximate max data points */
  approxMaxDataPoints: number
  /** Default visible range in days (for initial chart zoom) */
  defaultVisibleDays: number
}

/**
 * Maximum date range limits per timeframe
 * Based on keeping data points under ~5,000 for optimal performance
 */
export const TIMEFRAME_LIMITS: Record<TimeframeLimitKey, TimeframeLimit> = {
  '1h': {
    maxMonths: 3,
    description: '3 months',
    suggestedTimeframe: '4h',
    approxMaxDataPoints: 2160, // 24 * 30 * 3
    defaultVisibleDays: 7, // ~168 candles - easy to see hourly candles
  },
  '4h': {
    maxMonths: 12,
    description: '1 year',
    suggestedTimeframe: '1d',
    approxMaxDataPoints: 2190, // 6 * 30 * 12
    defaultVisibleDays: 30, // ~180 candles
  },
  '1d': {
    maxMonths: 60, // 5 years
    description: '5 years',
    suggestedTimeframe: '1w',
    approxMaxDataPoints: 1825, // 365 * 5
    defaultVisibleDays: 180, // ~180 candles
  },
  '1w': {
    maxMonths: 120, // 10 years
    description: '10 years',
    suggestedTimeframe: '1m',
    approxMaxDataPoints: 520, // 52 * 10
    defaultVisibleDays: 730, // ~104 candles (2 years)
  },
  '1m': {
    maxMonths: 240, // 20 years
    description: '20 years',
    approxMaxDataPoints: 240, // 12 * 20
    defaultVisibleDays: 1825, // ~60 candles (5 years)
  },
}

export interface DateRangeValidation {
  /** Whether the range is valid (within limits) */
  isValid: boolean
  /** Original start date */
  originalStartDate: string
  /** Original end date */
  originalEndDate: string
  /** Adjusted start date (if limited) */
  adjustedStartDate: string
  /** Adjusted end date (same as original) */
  adjustedEndDate: string
  /** Whether the range was adjusted */
  wasAdjusted: boolean
  /** Message to display to user */
  message?: string
  /** Timeframe limit details */
  limit: TimeframeLimit
  /** Selected months vs max months */
  selectedMonths: number
}

/**
 * Validate and adjust date range based on timeframe limits
 * 
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @param timeframe - Selected timeframe
 * @returns Validation result with adjusted dates if necessary
 */
export function validateDateRangeForTimeframe(
  startDate: string,
  endDate: string,
  timeframe: string
): DateRangeValidation {
  const normalizedTimeframe = timeframe.toLowerCase() as TimeframeLimitKey
  const limit = TIMEFRAME_LIMITS[normalizedTimeframe]
  
  if (!limit) {
    // Unknown timeframe, allow any range
    return {
      isValid: true,
      originalStartDate: startDate,
      originalEndDate: endDate,
      adjustedStartDate: startDate,
      adjustedEndDate: endDate,
      wasAdjusted: false,
      limit: TIMEFRAME_LIMITS['1d'],
      selectedMonths: 0,
    }
  }

  const start = dayjs(startDate)
  const end = dayjs(endDate)
  const selectedMonths = end.diff(start, 'month')

  if (selectedMonths <= limit.maxMonths) {
    return {
      isValid: true,
      originalStartDate: startDate,
      originalEndDate: endDate,
      adjustedStartDate: startDate,
      adjustedEndDate: endDate,
      wasAdjusted: false,
      limit,
      selectedMonths,
    }
  }

  // Range exceeds limit - adjust start date
  const adjustedStart = end.subtract(limit.maxMonths, 'month')

  return {
    isValid: false,
    originalStartDate: startDate,
    originalEndDate: endDate,
    adjustedStartDate: adjustedStart.toISOString(),
    adjustedEndDate: endDate,
    wasAdjusted: true,
    message: `Date range limited to ${limit.description} for ${timeframe.toUpperCase()} timeframe to ensure optimal performance.`,
    limit,
    selectedMonths,
  }
}

/**
 * Get a user-friendly message for timeframe limits
 */
export function getTimeframeLimitMessage(timeframe: string): string {
  const normalizedTimeframe = timeframe.toLowerCase() as TimeframeLimitKey
  const limit = TIMEFRAME_LIMITS[normalizedTimeframe]
  
  if (!limit) return ''
  
  return `Maximum ${limit.description} for ${timeframe.toUpperCase()} candles`
}

/**
 * Format timeframe for display
 */
export function formatTimeframeDisplay(timeframe: string): string {
  const map: Record<string, string> = {
    '1h': '1 Hour',
    '4h': '4 Hour',
    '1d': 'Daily',
    '1w': 'Weekly',
    '1m': 'Monthly',
  }
  return map[timeframe.toLowerCase()] || timeframe
}

/**
 * Get the default visible range for a timeframe
 * Returns the number of days that should be visible by default
 */
export function getDefaultVisibleDays(timeframe: string): number {
  const normalizedTimeframe = timeframe.toLowerCase() as TimeframeLimitKey
  const limit = TIMEFRAME_LIMITS[normalizedTimeframe]
  return limit?.defaultVisibleDays || 180 // Default to 6 months if unknown
}

/**
 * Calculate visible range dates based on timeframe
 * Returns start and end dates for the default visible range (zooms to end of data)
 */
export function getDefaultVisibleRange(
  endDate: string,
  timeframe: string
): { visibleFrom: string; visibleTo: string } {
  const days = getDefaultVisibleDays(timeframe)
  const end = dayjs(endDate)
  const start = end.subtract(days, 'day')
  
  return {
    visibleFrom: start.toISOString(),
    visibleTo: end.toISOString(),
  }
}
