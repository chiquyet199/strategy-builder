import type {
  CompareStrategiesRequest,
  BacktestResponse,
  StrategyConfig,
} from '@/shared/types/backtest'

// Use environment variable for API URL in production, relative path in development
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/backtest`
  : '/api/v1/backtest'

export const backtestService = {
  /**
   * Compare multiple strategies
   */
  async compareStrategies(request: CompareStrategiesRequest): Promise<BacktestResponse> {
    const response = await fetch(`${API_BASE_URL}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to compare strategies' }))
      throw new Error(error.message || error.data?.message || 'Failed to compare strategies')
    }

    // Parse response (may be wrapped or direct depending on backend configuration)
    const responseData = await response.json()
    
    // Check if response is wrapped in { data: ... } format
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      return responseData.data as BacktestResponse
    }
    
    // Response is direct (not wrapped)
    return responseData as BacktestResponse
  },

  /**
   * Helper function to build strategy config with defaults
   * For MVP, parameters are optional (uses defaults)
   */
  buildStrategyConfig(strategyId: string, parameters?: Record<string, any>): StrategyConfig {
    return {
      strategyId,
      ...(parameters && Object.keys(parameters).length > 0 && { parameters }),
    }
  },
}

