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

    // Track last purchase month and portfolio state
    let lastPurchaseMonth = start.getMonth();
    let lastPurchaseYear = start.getFullYear() - 1; // Initialize to before start
    let totalQuantityHeld = 0;
    let totalInvested = 0;

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
        totalQuantityHeld += quantityPurchased;
        totalInvested += monthlyAmount;

        const coinValue = totalQuantityHeld * price;
        const usdcValue = investmentAmount - totalInvested;
        const totalValue = coinValue + usdcValue;

        transactions.push({
          date: candle.timestamp,
          price,
          amount: monthlyAmount,
          quantityPurchased,
          reason: 'Monthly DCA purchase',
          portfolioValue: {
            coinValue,
            usdcValue,
            totalValue,
            quantityHeld: totalQuantityHeld,
          },
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

