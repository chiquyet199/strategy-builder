import { BaseStrategy } from './base.strategy';
import { StrategyResult, Transaction } from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';
import { MetricsCalculator } from '../utils/metrics-calculator';

/**
 * Weekly DCA Strategy
 * Invest a fixed amount every week
 */
export class WeeklyDcaStrategy extends BaseStrategy {
  getStrategyId(): string {
    return 'weekly-dca';
  }

  getStrategyName(): string {
    return 'Weekly DCA';
  }

  getDefaultParameters(): Record<string, any> {
    return {}; // No parameters for weekly DCA
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

    const transactions: Transaction[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.ceil(totalDays / 7);
    const weeklyAmount = investmentAmount / totalWeeks;

    // Track last purchase date
    let lastPurchaseDate = new Date(start);
    lastPurchaseDate.setDate(lastPurchaseDate.getDate() - 7); // Initialize to before start

    // Process each candle
    for (const candle of candles) {
      const candleDate = new Date(candle.timestamp);
      const daysSinceLastPurchase = Math.floor(
        (candleDate.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Buy every 7 days
      if (daysSinceLastPurchase >= 7) {
        const price = candle.close;
        const quantityPurchased = weeklyAmount / price;

        transactions.push({
          date: candle.timestamp,
          price,
          amount: weeklyAmount,
          quantityPurchased,
          reason: 'Weekly DCA purchase',
        });

        lastPurchaseDate = new Date(candleDate);
      }
    }

    // Build portfolio history
    const portfolioHistory = MetricsCalculator.buildPortfolioHistory(
      transactions,
      candles,
      startDate,
    );

    // Calculate total invested (may be less than investmentAmount if not enough weeks)
    const totalInvested = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate metrics
    const metrics = MetricsCalculator.calculate(transactions, portfolioHistory, totalInvested);

    return {
      strategyId: this.getStrategyId(),
      strategyName: this.getStrategyName(),
      parameters,
      transactions,
      metrics,
      portfolioValueHistory: portfolioHistory,
    };
  }
}

