import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IStrategy } from './interfaces/strategy.interface';
import { StrategyResult, InitialPortfolio, FundingSchedule } from './interfaces/strategy-result.interface';
import { Candlestick } from '../market-data/interfaces/candlestick.interface';
import { LumpSumStrategy } from './strategies/lump-sum.strategy';
import { DcaStrategy } from './strategies/dca.strategy';
import { RsiDcaStrategy } from './strategies/rsi-dca.strategy';
import { DipBuyerDcaStrategy } from './strategies/dip-buyer-dca.strategy';
import { MovingAverageDcaStrategy } from './strategies/moving-average-dca.strategy';
import { CombinedSmartDcaStrategy } from './strategies/combined-smart-dca.strategy';
import { RebalancingStrategy } from './strategies/rebalancing.strategy';

/**
 * Strategy Service
 * Manages strategy instances and provides factory methods
 */
@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);
  private readonly strategies: Map<string, IStrategy> = new Map();

  constructor() {
    // Register all available strategies
    this.registerStrategy(new LumpSumStrategy());
    this.registerStrategy(new DcaStrategy());
    this.registerStrategy(new RsiDcaStrategy());
    this.registerStrategy(new DipBuyerDcaStrategy());
    this.registerStrategy(new MovingAverageDcaStrategy());
    this.registerStrategy(new CombinedSmartDcaStrategy());
    this.registerStrategy(new RebalancingStrategy());
  }

  /**
   * Register a strategy
   */
  private registerStrategy(strategy: IStrategy): void {
    this.strategies.set(strategy.getStrategyId(), strategy);
    this.logger.log(`Registered strategy: ${strategy.getStrategyId()} - ${strategy.getStrategyName()}`);
  }

  /**
   * Get a strategy instance by ID
   * @param strategyId - Unique identifier of the strategy (e.g., 'lump-sum', 'dca')
   * @returns Strategy instance implementing IStrategy interface
   * @throws NotFoundException if strategy with given ID is not found
   */
  getStrategy(strategyId: string): IStrategy {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new NotFoundException(`Strategy with ID '${strategyId}' not found`);
    }
    return strategy;
  }

  /**
   * Get all registered strategy instances
   * @returns Array of all available strategy instances
   */
  getAllStrategies(): IStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get metadata (ID and name) for all available strategies
   * Useful for listing strategies without instantiating them
   * @returns Array of strategy metadata objects containing id and name
   */
  getStrategyMetadata(): Array<{ id: string; name: string }> {
    return this.getAllStrategies().map((strategy) => ({
      id: strategy.getStrategyId(),
      name: strategy.getStrategyName(),
    }));
  }

  /**
   * Calculate strategy results with given parameters
   * Supports both old format (investmentAmount) and new format (initialPortfolio) for backward compatibility
   * @param strategyId - Unique identifier of the strategy to calculate
   * @param candles - Candlestick data for the date range
   * @param initialPortfolioOrAmount - Initial portfolio configuration or investment amount (number)
   * @param fundingScheduleOrUndefined - Optional periodic funding schedule
   * @param startDate - Start date in ISO 8601 format
   * @param endDate - End date in ISO 8601 format
   * @param parameters - Optional strategy-specific parameters
   * @returns Strategy calculation results with transactions and metrics
   * @throws NotFoundException if strategy with given ID is not found
   */
  calculateStrategy(
    strategyId: string,
    candles: Candlestick[],
    initialPortfolioOrAmount: InitialPortfolio | number,
    fundingScheduleOrUndefined: FundingSchedule | undefined,
    startDate: string,
    endDate: string,
    parameters?: Record<string, any>,
  ): StrategyResult {
    const strategy = this.getStrategy(strategyId);
    
    // Handle backward compatibility: if number is passed, convert to InitialPortfolio
    const initialPortfolio: InitialPortfolio =
      typeof initialPortfolioOrAmount === 'number'
        ? { assets: [], usdcAmount: initialPortfolioOrAmount }
        : initialPortfolioOrAmount;
    
    const fundingSchedule: FundingSchedule | undefined = fundingScheduleOrUndefined;
    
    // For now, strategies still use the old interface, so we calculate investmentAmount from portfolio
    // TODO: Update all strategies to use InitialPortfolio directly
    const firstCandlePrice = candles[0]?.close || 0;
    const btcAsset = initialPortfolio.assets.find((a) => a.symbol === 'BTC');
    const btcValue = (btcAsset?.quantity || 0) * firstCandlePrice;
    const investmentAmount = btcValue + initialPortfolio.usdcAmount;
    
    // Pass funding schedule in parameters for now (strategies will be updated to accept it directly)
    const paramsWithFunding = {
      ...parameters,
      _initialPortfolio: initialPortfolio,
      _fundingSchedule: fundingSchedule,
    };
    
    return strategy.calculate(candles, investmentAmount, startDate, endDate, paramsWithFunding);
  }
}

