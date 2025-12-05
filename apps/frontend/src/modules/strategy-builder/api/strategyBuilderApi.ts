/**
 * Strategy Builder API
 * Handles API calls for custom strategy validation
 */

// Use environment variable for API URL in production, relative path in development
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/strategies`
  : '/api/v1/strategies'

export interface CustomStrategyConfig {
  name?: string
  rules: CustomRule[]
}

export interface CustomRule {
  id: string
  priority?: number
  enabled?: boolean
  when: WhenCondition
  then: ThenAction[]
}

export type WhenCondition =
  | ScheduleCondition
  | PriceChangeCondition
  | PriceLevelCondition
  | VolumeChangeCondition
  | IndicatorCondition
  | AndCondition
  | OrCondition

export interface ScheduleCondition {
  type: 'schedule'
  frequency: 'daily' | 'weekly' | 'monthly'
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  dayOfMonth?: number
  time?: string
}

export interface PriceChangeCondition {
  type: 'price_change'
  direction: 'drop' | 'rise'
  threshold: number
  referencePoint: '24h_high' | '7d_high' | '30d_high' | 'ath'
}

export interface PriceLevelCondition {
  type: 'price_level'
  operator: 'above' | 'below' | 'equals'
  price: number
}

export interface VolumeChangeCondition {
  type: 'volume_change'
  operator: 'above' | 'below'
  threshold: number
  lookbackDays: number
}

export interface AndCondition {
  type: 'and'
  conditions: WhenCondition[]
}

export interface OrCondition {
  type: 'or'
  conditions: WhenCondition[]
}

export interface IndicatorCondition {
  type: 'indicator'
  indicator: 'rsi' | 'ma' | 'macd' | 'bollinger'
  params: Record<string, any>
  operator: 'less_than' | 'greater_than' | 'equals' | 'crosses_above' | 'crosses_below'
  value: number
}

export type ThenAction =
  | BuyFixedAction
  | BuyPercentageAction
  | BuyScaledAction
  | SellFixedAction
  | SellPercentageAction
  | RebalanceAction
  | LimitOrderAction

export interface BuyFixedAction {
  type: 'buy_fixed'
  amount: number
}

export interface BuyPercentageAction {
  type: 'buy_percentage'
  percentage: number
}

export interface BuyScaledAction {
  type: 'buy_scaled'
  baseAmount: number
  scaleFactor: number
  maxAmount?: number
}

export interface RebalanceAction {
  type: 'rebalance'
  targetAllocation: number
  threshold?: number
}

export interface SellFixedAction {
  type: 'sell_fixed'
  amount: number
}

export interface SellPercentageAction {
  type: 'sell_percentage'
  percentage: number
}

export interface LimitOrderAction {
  type: 'limit_order'
  price: number
  amount: number
  expiresInDays?: number
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  level: 'error'
  field: string
  message: string
}

export interface ValidationWarning {
  level: 'warning' | 'info'
  field: string
  message: string
}

export const strategyBuilderApi = {
  /**
   * Validate a custom strategy configuration
   */
  async validate(config: CustomStrategyConfig): Promise<ValidationResult> {
    const response = await fetch(`${API_BASE_URL}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
      }
      
      // If backend returns validation errors in a structured format, preserve them
      if (errorData.errors && Array.isArray(errorData.errors)) {
        throw {
          message: errorData.message || 'Validation failed',
          errors: errorData.errors,
          warnings: errorData.warnings || [],
        }
      }
      
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const jsonResponse = await response.json()
    // Handle wrapped response format: { data: ValidationResult, message: string }
    // or direct ValidationResult format
    if (jsonResponse.data) {
      return jsonResponse.data as ValidationResult
    }
    return jsonResponse as ValidationResult
  },
}

