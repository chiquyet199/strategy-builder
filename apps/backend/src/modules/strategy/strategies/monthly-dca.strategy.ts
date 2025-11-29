import { BaseStrategy } from './base.strategy';
import { StrategyResult, Transaction } from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';
import { MetricsCalculator } from '../utils/metrics-calculator';

/**
 * Monthly DCA Strategy
 * Invest a fixed amount every month
 */
export class MonthlyDcaStrategy extends BaseStrategy {
  getStrategyId(): string {
    return 'monthly-dca';
  }

  getStrategyName(): string {
    return 'Monthly DCA';
  }

  getDefaultParameters(): Record<string, any> {
    return {}; // No parameters for monthly DCA
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
    
    // Calculate number of months
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                       (end.getMonth() - start.getMonth()) + 1;
    const monthlyAmount = investmentAmount / monthsDiff;

    // Track last purchase month
    let lastPurchaseMonth = start.getMonth();
    let lastPurchaseYear = start.getFullYear() - 1; // Initialize to before start

    // Process each candle
    for (const candle of candles) {
      const candleDate = new Date(candle.timestamp);
      const candleMonth = candleDate.getMonth();
      const candleYear = candleDate.getFullYear();

      // Buy on the first candle of each month
      if (candleYear > lastPurchaseYear || 
          (candleYear === lastPurchaseYear && candleMonth > lastPurchaseMonth)) {
        const price = candle.close;
        const quantityPurchased = monthlyAmount / price;

        transactions.push({
          date: candle.timestamp,
          price,
          amount: monthlyAmount,
          quantityPurchased,
          reason: 'Monthly DCA purchase',
        });

        lastPurchaseMonth = candleMonth;
        lastPurchaseYear = candleYear;
      }
    }

    // Build portfolio history
    const portfolioHistory = MetricsCalculator.buildPortfolioHistory(
      transactions,
      candles,
      startDate,
    );

    // Calculate total invested
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

