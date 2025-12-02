import { Candlestick } from '../../market-data/interfaces/candlestick.interface';
import { StrategyResult } from './strategy-result.interface';

/**
 * Strategy interface
 * All strategies must implement this interface
 */
export interface IStrategy {
  /**
   * Get the unique identifier for this strategy
   */
  getStrategyId(): string;

  /**
   * Get the display name for this strategy
   */
  getStrategyName(): string;

  /**
   * Calculate strategy results
   * @param candles - Candlestick data for the date range
   * @param investmentAmount - Total investment amount in USD
   * @param startDate - Start date (ISO 8601)
   * @param endDate - End date (ISO 8601)
   * @param parameters - Optional strategy-specific parameters
   * @returns Strategy calculation results
   */
  calculate(
    candles: Candlestick[],
    investmentAmount: number,
    startDate: string,
    endDate: string,
    parameters?: Record<string, any>,
  ): StrategyResult;

  /**
   * Get default parameters for this strategy
   */
  getDefaultParameters(): Record<string, any>;

  /**
   * Validate parameters for this strategy
   * @throws Error if parameters are invalid
   */
  validateParameters(parameters?: Record<string, any>): void;
}
