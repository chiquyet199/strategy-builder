/**
 * Strategy Builder Service
 * Handles business logic for custom strategy building
 */

import { strategyBuilderApi, type CustomStrategyConfig, type ValidationResult } from '../api/strategyBuilderApi'
import { useStrategyBuilderStore } from '../stores/strategyBuilderStore'

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

