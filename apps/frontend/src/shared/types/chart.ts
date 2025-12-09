/**
 * Trading Chart Types
 * Used with TradingView Lightweight Charts
 */

import type { SeriesMarkerPosition, SeriesMarkerShape } from 'lightweight-charts'

/**
 * Time value for chart data
 * - number: Unix timestamp in seconds (works for all timeframes including intraday)
 * - string: Business day string 'YYYY-MM-DD' (only for daily/weekly/monthly)
 */
export type ChartTime = number | string

/**
 * OHLC Candlestick data point
 */
export interface CandleData {
  time: ChartTime // Unix timestamp (seconds) or 'YYYY-MM-DD' string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/**
 * Volume data point
 */
export interface VolumeData {
  time: ChartTime
  value: number
  color?: string
}

/**
 * Line/Area chart data point
 */
export interface LineData {
  time: ChartTime
  value: number
}

/**
 * Marker displayed on the chart (buy/sell signals, triggers, etc.)
 */
export interface ChartMarker {
  time: ChartTime
  position: SeriesMarkerPosition // 'aboveBar' | 'belowBar' | 'inBar'
  color: string
  shape: SeriesMarkerShape // 'circle' | 'square' | 'arrowUp' | 'arrowDown'
  text?: string
  size?: number
}

/**
 * Supported timeframes
 */
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1D' | '1W' | '1M'

/**
 * Chart theme
 */
export type ChartTheme = 'light' | 'dark'

/**
 * Price line configuration
 */
export interface PriceLine {
  price: number
  color: string
  lineWidth?: number
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  title?: string
}

/**
 * Chart configuration options
 */
export interface TradingChartOptions {
  /** Chart height in pixels */
  height?: number
  /** Show volume histogram below price chart */
  showVolume?: boolean
  /** Show crosshair */
  showCrosshair?: boolean
  /** Chart theme */
  theme?: ChartTheme
  /** Auto-scale to fit all data */
  autoScale?: boolean
  /** Right price scale visible */
  rightPriceScale?: boolean
  /** Time scale visible */
  timeScale?: boolean
  /** Watermark text (e.g., symbol name) */
  watermark?: string
}

/**
 * Visible time range
 */
export interface TimeRange {
  from: ChartTime
  to: ChartTime
}

/**
 * Chart event payloads
 */
export interface ChartClickEvent {
  time: ChartTime
  price: number
}

export interface ChartCrosshairEvent {
  time: ChartTime
  price: number
  point: { x: number; y: number }
}

export interface ChartRangeChangeEvent {
  from: ChartTime
  to: ChartTime
}
