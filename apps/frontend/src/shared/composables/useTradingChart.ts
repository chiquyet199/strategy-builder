/**
 * Composable for TradingView Lightweight Charts v5
 * Handles chart initialization, data management, and lifecycle
 */

import { ref, shallowRef, onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts'
import type {
  CandleData,
  ChartMarker,
  TradingChartOptions,
  ChartTheme,
  ChartTime,
} from '@/shared/types/chart'

// Theme configurations
const THEMES = {
  light: {
    background: '#ffffff',
    text: '#333333',
    grid: '#f0f0f0',
    border: '#e0e0e0',
    crosshair: '#758696',
    upColor: '#26a69a',
    downColor: '#ef5350',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    volumeUp: 'rgba(38, 166, 154, 0.5)',
    volumeDown: 'rgba(239, 83, 80, 0.5)',
  },
  dark: {
    background: '#1e1e1e',
    text: '#d1d4dc',
    grid: '#2b2b2b',
    border: '#3c3c3c',
    crosshair: '#758696',
    upColor: '#26a69a',
    downColor: '#ef5350',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    volumeUp: 'rgba(38, 166, 154, 0.5)',
    volumeDown: 'rgba(239, 83, 80, 0.5)',
  },
}

// Type for the markers primitive returned by createSeriesMarkers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SeriesMarkersPrimitive = any

export interface UseTradingChartReturn {
  /** Reference to the chart container element */
  chartContainerRef: Ref<HTMLElement | null>
  /** Chart API instance */
  chart: Ref<IChartApi | null>
  /** Candlestick series API */
  candlestickSeries: Ref<ISeriesApi<'Candlestick'> | null>
  /** Volume series API */
  volumeSeries: Ref<ISeriesApi<'Histogram'> | null>
  /** Update candle data */
  setData: (data: CandleData[]) => void
  /** Add/update markers */
  setMarkers: (markers: ChartMarker[]) => void
  /** Fit chart to all data */
  fitContent: () => void
  /** Set visible range */
  setVisibleRange: (from: ChartTime, to: ChartTime) => void
  /** Change theme */
  setTheme: (theme: ChartTheme) => void
  /** Resize chart */
  resize: (width?: number, height?: number) => void
}

export function useTradingChart(
  options: TradingChartOptions = {}
): UseTradingChartReturn {
  const {
    height = 400,
    showVolume = true,
    showCrosshair = true,
    theme = 'light',
    autoScale = true,
    rightPriceScale = true,
    timeScale = true,
    watermark,
  } = options

  const chartContainerRef = ref<HTMLElement | null>(null)
  const chart = shallowRef<IChartApi | null>(null)
  const candlestickSeries = shallowRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeries = shallowRef<ISeriesApi<'Histogram'> | null>(null)
  const currentTheme = ref<ChartTheme>(theme)
  
  // Series markers primitive (v5 API)
  let seriesMarkers: SeriesMarkersPrimitive | null = null

  let resizeObserver: ResizeObserver | null = null

  /**
   * Convert CandleData to lightweight-charts format
   */
  function formatCandleData(data: CandleData[]): CandlestickData<Time>[] {
    return data.map((candle) => ({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }))
  }

  /**
   * Convert CandleData to volume histogram data
   */
  function formatVolumeData(data: CandleData[]): HistogramData<Time>[] {
    const themeColors = THEMES[currentTheme.value]
    return data
      .filter((candle) => candle.volume !== undefined)
      .map((candle) => ({
        time: candle.time as Time,
        value: candle.volume!,
        color: candle.close >= candle.open ? themeColors.volumeUp : themeColors.volumeDown,
      }))
  }

  /**
   * Convert ChartMarker to lightweight-charts marker format
   */
  function formatMarkers(markers: ChartMarker[]) {
    return markers.map((marker) => ({
      time: marker.time as Time,
      position: marker.position as 'aboveBar' | 'belowBar' | 'inBar',
      color: marker.color,
      shape: marker.shape as 'circle' | 'square' | 'arrowUp' | 'arrowDown',
      text: marker.text,
      size: marker.size,
    }))
  }

  /**
   * Get chart options for a theme
   */
  function getChartOptions(themeName: ChartTheme) {
    const themeColors = THEMES[themeName]
    return {
      layout: {
        background: { type: ColorType.Solid, color: themeColors.background },
        textColor: themeColors.text,
      },
      grid: {
        vertLines: { color: themeColors.grid },
        horzLines: { color: themeColors.grid },
      },
      crosshair: {
        mode: showCrosshair ? CrosshairMode.Normal : CrosshairMode.Hidden,
        vertLine: {
          color: themeColors.crosshair,
          width: 1 as const,
          style: 2, // Dashed
          labelBackgroundColor: themeColors.crosshair,
        },
        horzLine: {
          color: themeColors.crosshair,
          width: 1 as const,
          style: 2,
          labelBackgroundColor: themeColors.crosshair,
        },
      },
      rightPriceScale: {
        visible: rightPriceScale,
        borderColor: themeColors.border,
      },
      timeScale: {
        visible: timeScale,
        borderColor: themeColors.border,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      watermark: watermark
        ? {
            visible: true,
            text: watermark,
            fontSize: 48,
            color: 'rgba(128, 128, 128, 0.2)',
            horzAlign: 'center' as const,
            vertAlign: 'center' as const,
          }
        : undefined,
    }
  }

  /**
   * Initialize the chart
   */
  function initChart() {
    if (!chartContainerRef.value) return

    // Clean up existing chart
    if (chart.value) {
      chart.value.remove()
    }
    seriesMarkers = null

    const themeColors = THEMES[currentTheme.value]

    // Create chart
    chart.value = createChart(chartContainerRef.value, {
      width: chartContainerRef.value.clientWidth,
      height,
      ...getChartOptions(currentTheme.value),
    })

    // Add candlestick series (v5 API)
    candlestickSeries.value = chart.value.addSeries(CandlestickSeries, {
      upColor: themeColors.upColor,
      downColor: themeColors.downColor,
      borderDownColor: themeColors.downColor,
      borderUpColor: themeColors.upColor,
      wickDownColor: themeColors.wickDownColor,
      wickUpColor: themeColors.wickUpColor,
    })

    // Add volume series if enabled (v5 API)
    if (showVolume) {
      volumeSeries.value = chart.value.addSeries(HistogramSeries, {
        color: themeColors.volumeUp,
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '', // Overlay on main chart
      })

      // Scale volume to bottom 20% of chart
      volumeSeries.value.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })
    }

    // Auto-fit content
    if (autoScale) {
      chart.value.timeScale().fitContent()
    }

    // Setup resize observer
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || !chart.value) return
      const { width } = entry.contentRect
      chart.value.applyOptions({ width })
    })
    resizeObserver.observe(chartContainerRef.value)
  }

  /**
   * Set candlestick data
   */
  function setData(data: CandleData[]) {
    if (!candlestickSeries.value) return

    const formattedData = formatCandleData(data)
    candlestickSeries.value.setData(formattedData)

    if (showVolume && volumeSeries.value) {
      const volumeData = formatVolumeData(data)
      volumeSeries.value.setData(volumeData)
    }

    // Fit content after setting data
    if (autoScale && chart.value) {
      chart.value.timeScale().fitContent()
    }
  }

  /**
   * Set markers on the chart (v5 API using createSeriesMarkers)
   */
  function setMarkers(markers: ChartMarker[]) {
    if (!candlestickSeries.value) return
    
    const formattedMarkers = formatMarkers(markers)
    
    // In v5, we use createSeriesMarkers primitive
    if (seriesMarkers) {
      // Update existing markers
      seriesMarkers.setMarkers(formattedMarkers)
    } else {
      // Create new markers primitive
      seriesMarkers = createSeriesMarkers(candlestickSeries.value, formattedMarkers)
    }
  }

  /**
   * Fit chart to show all data
   */
  function fitContent() {
    if (!chart.value) return
    chart.value.timeScale().fitContent()
  }

  /**
   * Set visible time range
   */
  function setVisibleRange(from: ChartTime, to: ChartTime) {
    if (!chart.value) return
    chart.value.timeScale().setVisibleRange({
      from: from as Time,
      to: to as Time,
    })
  }

  /**
   * Change chart theme
   */
  function setTheme(newTheme: ChartTheme) {
    if (!chart.value) return
    currentTheme.value = newTheme
    const themeColors = THEMES[newTheme]

    chart.value.applyOptions(getChartOptions(newTheme))

    if (candlestickSeries.value) {
      candlestickSeries.value.applyOptions({
        upColor: themeColors.upColor,
        downColor: themeColors.downColor,
        borderDownColor: themeColors.downColor,
        borderUpColor: themeColors.upColor,
        wickDownColor: themeColors.wickDownColor,
        wickUpColor: themeColors.wickUpColor,
      })
    }
  }

  /**
   * Resize the chart
   */
  function resize(width?: number, newHeight?: number) {
    if (!chart.value || !chartContainerRef.value) return
    chart.value.applyOptions({
      width: width ?? chartContainerRef.value.clientWidth,
      height: newHeight ?? height,
    })
  }

  // Lifecycle
  onMounted(() => {
    initChart()
  })

  onBeforeUnmount(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    if (chart.value) {
      chart.value.remove()
    }
    seriesMarkers = null
  })

  // Watch for container ref changes
  watch(chartContainerRef, (newRef) => {
    if (newRef) {
      initChart()
    }
  })

  return {
    chartContainerRef,
    chart,
    candlestickSeries,
    volumeSeries,
    setData,
    setMarkers,
    fitContent,
    setVisibleRange,
    setTheme,
    resize,
  }
}
