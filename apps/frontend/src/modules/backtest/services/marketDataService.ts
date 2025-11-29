import type { Candlestick, Timeframe } from '@/shared/types/backtest'

// Use environment variable for API URL in production, relative path in development
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/market-data`
  : '/api/v1/market-data'

interface ApiResponse<T> {
  data: T
  message?: string
  meta?: Record<string, unknown>
}

export const marketDataService = {
  /**
   * Get candlestick data for a symbol, timeframe, and date range
   */
  async getCandles(
    symbol: string = 'BTC/USD',
    timeframe: Timeframe = '1d',
    startDate: string,
    endDate: string,
  ): Promise<Candlestick[]> {
    const params = new URLSearchParams({
      symbol,
      timeframe,
      startDate,
      endDate,
    })

    const response = await fetch(`${API_BASE_URL}/candles?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch market data' }))
      throw new Error(error.message || 'Failed to fetch market data')
    }

    // Market data endpoint returns array directly, not wrapped in ApiResponse
    const data: Candlestick[] = await response.json()
    return data
  },
}

