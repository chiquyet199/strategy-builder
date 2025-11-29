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

    // Track last purchase date and portfolio state
    let lastPurchaseDate = new Date(start);
    lastPurchaseDate.setDate(lastPurchaseDate.getDate() - 7); // Initialize to before start
    let totalQuantityHeld = 0;
    let totalInvested = 0;

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
        totalQuantityHeld += quantityPurchased;
        totalInvested += weeklyAmount;

        const coinValue = totalQuantityHeld * price;
        const usdcValue = investmentAmount - totalInvested;
        const totalValue = coinValue + usdcValue;

        transactions.push({
          date: candle.timestamp,
          price,
          amount: weeklyAmount,
          quantityPurchased,
          reason: 'Weekly DCA purchase',
          portfolioValue: {
            coinValue,
            usdcValue,
            totalValue,
            quantityHeld: totalQuantityHeld,
          },
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

    // Calculate metrics (totalInvested is already tracked in the loop)
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

