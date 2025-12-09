/**
 * Strategy Builder Service
 * Handles business logic for custom strategy building
 */

import {
  strategyBuilderApi,
  type CustomStrategyConfig,
  type ValidationResult,
  type WhenCondition,
  type ThenAction,
  type ScheduleCondition,
  type PriceChangeCondition,
  type PriceLevelCondition,
  type PriceStreakCondition,
  type PortfolioValueCondition,
  type VolumeChangeCondition,
  type IndicatorCondition,
  type BuyFixedAction,
  type BuyPercentageAction,
  type BuyScaledAction,
  type SellFixedAction,
  type SellPercentageAction,
  type TakeProfitAction,
  type RebalanceAction,
  type LimitOrderAction,
} from '../api/strategyBuilderApi'
import { useStrategyBuilderStore } from '../stores/strategyBuilderStore'

/**
 * Create a default condition based on type
 */
export function createDefaultCondition(type: string): WhenCondition | null {
  switch (type) {
    case 'schedule':
      return {
        type: 'schedule',
        frequency: 'weekly',
        dayOfWeek: 'monday',
      } as ScheduleCondition
    case 'price_change':
      return {
        type: 'price_change',
        direction: 'drop',
        threshold: 0.1,
        referencePoint: '7d_high',
      } as PriceChangeCondition
    case 'price_level':
      return {
        type: 'price_level',
        operator: 'below',
        price: 50000,
      } as PriceLevelCondition
    case 'price_streak':
      return {
        type: 'price_streak',
        direction: 'drop',
        streakCount: 3,
      } as PriceStreakCondition
    case 'portfolio_value':
      return {
        type: 'portfolio_value',
        mode: 'percentage',
        target: 0.5,
        operator: 'reaches',
        referencePoint: 'initial_investment',
      } as PortfolioValueCondition
    case 'volume_change':
      return {
        type: 'volume_change',
        operator: 'above',
        threshold: 1.5,
        lookbackDays: 7,
      } as VolumeChangeCondition
    case 'indicator':
      return {
        type: 'indicator',
        indicator: 'rsi',
        params: { period: 14 },
        operator: 'less_than',
        value: 30,
      } as IndicatorCondition
    default:
      return null
  }
}

/**
 * Create a default action based on type
 */
export function createDefaultAction(type: string): ThenAction | null {
  switch (type) {
    case 'buy_fixed':
      return { type: 'buy_fixed', amount: 100 } as BuyFixedAction
    case 'buy_percentage':
      return { type: 'buy_percentage', percentage: 0.5 } as BuyPercentageAction
    case 'buy_scaled':
      return { type: 'buy_scaled', baseAmount: 100, scaleFactor: 2.0 } as BuyScaledAction
    case 'sell_fixed':
      return { type: 'sell_fixed', amount: 100 } as SellFixedAction
    case 'sell_percentage':
      return { type: 'sell_percentage', percentage: 0.5 } as SellPercentageAction
    case 'take_profit':
      return { type: 'take_profit', percentage: 0.5 } as TakeProfitAction
    case 'rebalance':
      return { type: 'rebalance', targetAllocation: 0.8, threshold: 0.05 } as RebalanceAction
    case 'limit_order':
      return { type: 'limit_order', price: 50000, amount: 100 } as LimitOrderAction
    default:
      return null
  }
}

class StrategyBuilderService {
  private store = useStrategyBuilderStore()

  /**
   * Validate a custom strategy configuration
   */
  async validateStrategy(config: CustomStrategyConfig): Promise<ValidationResult> {
    this.store.setValidating(true)
    this.store.setValidationResult(null)

    try {
      const result = await strategyBuilderApi.validate(config)
      this.store.setValidationResult(result)
      return result
    } catch (error: any) {
      // Check if error already has structured validation result
      if (error.errors && Array.isArray(error.errors)) {
        const errorResult: ValidationResult = {
          valid: false,
          errors: error.errors,
          warnings: error.warnings || [],
        }
        this.store.setValidationResult(errorResult)
        return errorResult
      }
      
      // Try to extract detailed error message from response
      let errorMessage = 'Failed to validate strategy'
      
      if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      const errorResult: ValidationResult = {
        valid: false,
        errors: [
          {
            level: 'error',
            field: 'strategy',
            message: errorMessage,
          },
        ],
        warnings: [],
      }
      this.store.setValidationResult(errorResult)
      // Don't throw - let the UI show the error
      return errorResult
    } finally {
      this.store.setValidating(false)
    }
  }

  /**
   * Generate a unique rule ID
   */
  generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create a default rule
   */
  createDefaultRule(): CustomStrategyConfig['rules'][0] {
    return {
      id: this.generateRuleId(),
      priority: 1,
      enabled: true,
      when: {
        type: 'schedule',
        frequency: 'weekly',
        dayOfWeek: 'monday',
      },
      then: [
        {
          type: 'buy_fixed',
          amount: 100,
        },
      ],
    }
  }
}

export const strategyBuilderService = new StrategyBuilderService()

