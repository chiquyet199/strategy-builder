import { IStrategy } from '../interfaces/strategy.interface';
import { StrategyResult } from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

/**
 * Base Strategy Class
 * Provides common functionality and parameter handling for all strategies
 */
export abstract class BaseStrategy implements IStrategy {
  /**
   * Get the unique identifier for this strategy
   */
  abstract getStrategyId(): string;

  /**
   * Get the display name for this strategy
   */
  abstract getStrategyName(): string;

  /**
   * Calculate strategy results
   * Merges user parameters with defaults before calculation
   */
  calculate(
    candles: Candlestick[],
    investmentAmount: number,
    startDate: string,
    endDate: string,
    parameters?: Record<string, any>,
  ): StrategyResult {
    // Merge user parameters with defaults
    const mergedParams = this.mergeParameters(parameters);

    // Validate parameters
    this.validateParameters(mergedParams);

    // Perform calculation with merged parameters
    return this.calculateInternal(candles, investmentAmount, startDate, endDate, mergedParams);
  }

  /**
   * Internal calculation method (to be implemented by subclasses)
   */
  protected abstract calculateInternal(
    candles: Candlestick[],
    investmentAmount: number,
    startDate: string,
    endDate: string,
    parameters: Record<string, any>,
  ): StrategyResult;

  /**
   * Get default parameters for this strategy
   */
  abstract getDefaultParameters(): Record<string, any>;

  /**
   * Validate parameters for this strategy
   * @throws Error if parameters are invalid
   */
  abstract validateParameters(parameters?: Record<string, any>): void;

  /**
   * Merge user parameters with defaults
   * User parameters override defaults
   */
  protected mergeParameters(userParams?: Record<string, any>): Record<string, any> {
    const defaults = this.getDefaultParameters();
    if (!userParams) {
      return defaults;
    }
    return { ...defaults, ...userParams };
  }
}

