import { IStrategy } from '../interfaces/strategy.interface';
import {
  StrategyResult,
  InitialPortfolio,
  FundingSchedule,
} from '../interfaces/strategy-result.interface';
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
   * Supports both old format (investmentAmount) and new format (InitialPortfolio via parameters)
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

    // Extract InitialPortfolio and FundingSchedule from parameters if present
    const initialPortfolio: InitialPortfolio | undefined =
      mergedParams._initialPortfolio;
    const fundingSchedule: FundingSchedule | undefined =
      mergedParams._fundingSchedule;

    // If InitialPortfolio is provided, use it; otherwise use investmentAmount (backward compatibility)
    let actualInvestmentAmount = investmentAmount;
    if (initialPortfolio) {
      const firstCandlePrice = candles[0]?.close || 0;
      const btcAsset = initialPortfolio.assets.find((a) => a.symbol === 'BTC');
      const btcValue = (btcAsset?.quantity || 0) * firstCandlePrice;
      actualInvestmentAmount = btcValue + initialPortfolio.usdcAmount;
    }

    // Perform calculation with merged parameters
    // Pass InitialPortfolio and FundingSchedule in parameters for strategies to use
    return this.calculateInternal(
      candles,
      actualInvestmentAmount,
      startDate,
      endDate,
      {
        ...mergedParams,
        _initialPortfolio: initialPortfolio,
        _fundingSchedule: fundingSchedule,
      },
    );
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
  protected mergeParameters(
    userParams?: Record<string, any>,
  ): Record<string, any> {
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

  /**
   * Get initial state from portfolio configuration
   * Calculates initial asset quantity, USDC, and total value
   * @param initialPortfolio - Initial portfolio configuration
   * @param firstCandlePrice - Price at startDate for calculating total value
   * @param assetSymbol - Asset symbol to track (defaults to 'BTC' for backward compatibility, but extensible)
   * @returns Initial state with asset quantity, USDC, and total value
   */
  protected getInitialState(
    initialPortfolio: InitialPortfolio,
    firstCandlePrice: number,
    assetSymbol: string = 'BTC',
  ): {
    initialAssetQuantity: number;
    initialUsdc: number;
    totalInitialValue: number;
  } {
    // Find asset in assets array
    const asset = initialPortfolio.assets.find((a) => a.symbol === assetSymbol);
    const initialAssetQuantity = asset?.quantity || 0;
    const initialUsdc = initialPortfolio.usdcAmount || 0;

    // Calculate total initial value from assets + USDC
    const assetValue = initialAssetQuantity * firstCandlePrice;
    const totalInitialValue = assetValue + initialUsdc;

    return {
      initialAssetQuantity,
      initialUsdc,
      totalInitialValue,
    };
  }
}
