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
    // Add global configuration defaults
    const globalDefaults = {
      allowNegativeUsdc: false, // By default, don't allow negative USDC
    };
    const allDefaults = { ...globalDefaults, ...defaults };
    if (!userParams) {
      return allDefaults;
    }
    return { ...allDefaults, ...userParams };
  }

  /**
   * Calculate the maximum purchase amount based on available cash
   * If allowNegativeUsdc is false, caps the amount to available cash
   * @param desiredAmount - The desired purchase amount
   * @param availableCash - The available cash (USDC)
   * @param allowNegativeUsdc - Whether negative USDC is allowed
   * @returns The actual purchase amount (capped if needed)
   */
  protected calculatePurchaseAmount(
    desiredAmount: number,
    availableCash: number,
    allowNegativeUsdc: boolean = false,
  ): number {
    if (allowNegativeUsdc) {
      return desiredAmount;
    }
    // Cap purchase amount to available cash
    return Math.max(0, Math.min(desiredAmount, availableCash));
  }
}

