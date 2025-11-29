import { BaseStrategy } from './base.strategy';
import { StrategyResult, Transaction } from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';
import { MetricsCalculator } from '../utils/metrics-calculator';

/**
 * DCA Strategy
 * Invest a fixed amount at regular intervals (daily, weekly, monthly)
 */
export class DcaStrategy extends BaseStrategy {
  getStrategyId(): string {
    return 'dca';
  }

  getStrategyName(): string {
    return 'DCA (Dollar-Cost Averaging)';
  }

  getDefaultParameters(): Record<string, any> {
    return {
      frequency: 'weekly', // 'daily', 'weekly', 'monthly'
    };
  }

  validateParameters(parameters?: Record<string, any>): void {
    if (parameters?.frequency) {
      const validFrequencies = ['daily', 'weekly', 'monthly'];
      if (!validFrequencies.includes(parameters.frequency)) {
        throw new Error(`Frequency must be one of: ${validFrequencies.join(', ')}`);
      }
    }
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

    const frequency = parameters.frequency || 'weekly';
    const transactions: Transaction[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate number of periods based on frequency
    let totalPeriods: number;
    let periodDays: number;

    switch (frequency) {
      case 'daily':
        totalPeriods = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        periodDays = 1
        break
      case 'weekly':
        totalPeriods = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))
        periodDays = 7
        break
      case 'monthly':
        const monthsDiff =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1
        totalPeriods = monthsDiff
        periodDays = 30 // Approximate
        break
      default:
        totalPeriods = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))
        periodDays = 7
    }

    const periodAmount = investmentAmount / totalPeriods;

    let currentQuantityHeld = 0;
    let currentUsdcBalance = investmentAmount; // Start with total investment as USDC
    let totalInvested = 0;

    // Track last purchase date
    let lastPurchaseDate = new Date(start);
    lastPurchaseDate.setDate(lastPurchaseDate.getDate() - periodDays); // Initialize to before start

    // Process each candle
    for (const candle of candles) {
      const candleDate = new Date(candle.timestamp);
      const daysSinceLastPurchase = Math.floor(
        (candleDate.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      let shouldPurchase = false;

      if (frequency === 'daily' && daysSinceLastPurchase >= 1) {
        shouldPurchase = true;
      } else if (frequency === 'weekly' && daysSinceLastPurchase >= 7) {
        shouldPurchase = true;
      } else if (frequency === 'monthly') {
        const candleMonth = candleDate.getMonth();
        const candleYear = candleDate.getFullYear();
        const lastPurchaseMonth = lastPurchaseDate.getMonth();
        const lastPurchaseYear = lastPurchaseDate.getFullYear();

        if (
          candleYear > lastPurchaseYear ||
          (candleYear === lastPurchaseYear && candleMonth > lastPurchaseMonth)
        ) {
          shouldPurchase = true
        }
      }

      if (shouldPurchase) {
        const price = candle.close;
        const quantityPurchased = periodAmount / price;

        currentQuantityHeld += quantityPurchased;
        currentUsdcBalance -= periodAmount;
        totalInvested += periodAmount;

        const coinValue = currentQuantityHeld * price;
        const totalValue = coinValue + currentUsdcBalance;

        transactions.push({
          date: candle.timestamp,
          price,
          amount: periodAmount,
          quantityPurchased,
          reason: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} DCA purchase`,
          portfolioValue: {
            coinValue,
            usdcValue: currentUsdcBalance,
            totalValue,
            quantityHeld: currentQuantityHeld,
          },
        })

        lastPurchaseDate = new Date(candleDate);
      }
    }

    // Build portfolio history
    const portfolioHistory = MetricsCalculator.buildPortfolioHistory(
      transactions,
      candles,
      startDate,
    )

    // Calculate metrics
    const metrics = MetricsCalculator.calculate(transactions, portfolioHistory, totalInvested)

    return {
      strategyId: this.getStrategyId(),
      strategyName: this.getStrategyName(),
      parameters,
      transactions,
      metrics,
      portfolioValueHistory: portfolioHistory,
    }
  }
}

