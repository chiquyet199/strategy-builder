import { BaseStrategy } from './base.strategy';
import { StrategyResult, Transaction } from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';
import { MetricsCalculator } from '../utils/metrics-calculator';

/**
 * Lump Sum Strategy
 * Buy entire investment amount at the start date, hold until end
 */
export class LumpSumStrategy extends BaseStrategy {
  getStrategyId(): string {
    return 'lump-sum';
  }

  getStrategyName(): string {
    return 'Lump Sum';
  }

  getDefaultParameters(): Record<string, any> {
    return {}; // No parameters for lump sum
  }

  validateParameters(parameters?: Record<string, any>): void {
    // No parameters to validate
  }

  protected calculateInternal(
    candles: Candlestick[],
    investmentAmount: number,
    startDate: string,
    endDate: string,
    parameters: Record<string, any>,
  ): StrategyResult {
    if (candles.length === 0) {
      throw new Error('No candles provided for calculation');
    }

    // Buy at the first candle (start date)
    const firstCandle = candles[0];
    const price = firstCandle.close;
    const btcPurchased = investmentAmount / price;

    const transaction: Transaction = {
      date: firstCandle.timestamp,
      price,
      amount: investmentAmount,
      btcPurchased,
      reason: 'Initial lump sum purchase',
    };

    // Build portfolio history
    const portfolioHistory = MetricsCalculator.buildPortfolioHistory(
      [transaction],
      candles,
      startDate,
    );

    // Calculate metrics
    const metrics = MetricsCalculator.calculate(
      [transaction],
      portfolioHistory,
      investmentAmount,
    );

    return {
      strategyId: this.getStrategyId(),
      strategyName: this.getStrategyName(),
      parameters,
      transactions: [transaction],
      metrics,
      portfolioValueHistory: portfolioHistory,
    };
  }
}

