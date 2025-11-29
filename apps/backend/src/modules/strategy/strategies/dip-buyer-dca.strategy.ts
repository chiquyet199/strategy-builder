import { BaseStrategy } from './base.strategy';
import { StrategyResult, Transaction } from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';
import { MetricsCalculator } from '../utils/metrics-calculator';
import { DipBuyerDcaParameters } from '../interfaces/strategy-parameters.interface';

/**
 * Dip Buyer DCA Strategy
 * Double purchase on 10%+ drops from recent high
 */
export class DipBuyerDcaStrategy extends BaseStrategy {
  getStrategyId(): string {
    return 'dip-buyer-dca';
  }

  getStrategyName(): string {
    return 'Dip Buyer DCA';
  }

  getDefaultParameters(): Record<string, any> {
    return {
      lookbackDays: 30,
      dropThreshold: 0.10, // 10%
      buyMultiplier: 2.0,
    };
  }

  validateParameters(parameters?: Record<string, any>): void {
    if (!parameters) return;

    const params = parameters as DipBuyerDcaParameters;

    if (params.lookbackDays !== undefined) {
      if (params.lookbackDays < 1 || params.lookbackDays > 365) {
        throw new Error('Lookback days must be between 1 and 365');
      }
    }

    if (params.dropThreshold !== undefined) {
      if (params.dropThreshold < 0 || params.dropThreshold > 1) {
        throw new Error('Drop threshold must be between 0 and 1 (0% to 100%)');
      }
    }

    if (params.buyMultiplier !== undefined) {
      if (params.buyMultiplier < 0.1 || params.buyMultiplier > 10) {
        throw new Error('Buy multiplier must be between 0.1 and 10');
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

    const params = parameters as DipBuyerDcaParameters;
    const lookbackDays = params.lookbackDays || 30;
    const dropThreshold = params.dropThreshold || 0.10;
    const buyMultiplier = params.buyMultiplier || 2.0;

    // Calculate base DCA amount (weekly)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.ceil(totalDays / 7);
    const baseWeeklyAmount = investmentAmount / totalWeeks;

    const transactions: Transaction[] = [];
    let lastPurchaseDate = new Date(start);
    lastPurchaseDate.setDate(lastPurchaseDate.getDate() - 7);
    let totalQuantityHeld = 0;
    let totalInvested = 0;

    // Process each candle
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const candleDate = new Date(candle.timestamp);
      const daysSinceLastPurchase = Math.floor(
        (candleDate.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Calculate recent high (lookback period)
      const lookbackStart = Math.max(0, i - lookbackDays);
      const recentCandles = candles.slice(lookbackStart, i + 1);
      const recentHigh = Math.max(...recentCandles.map((c) => c.high));
      const currentPrice = candle.close;

      // Calculate drop percentage
      const dropPercent = (recentHigh - currentPrice) / recentHigh;

      // Buy every 7 days (weekly base)
      if (daysSinceLastPurchase >= 7) {
        let buyAmount = baseWeeklyAmount;
        let reason = 'Weekly DCA purchase';

        // Check if we're in a dip
        if (dropPercent >= dropThreshold) {
          buyAmount = baseWeeklyAmount * buyMultiplier;
          reason = `Dip detected: ${(dropPercent * 100).toFixed(2)}% drop from recent high - ${buyMultiplier}x purchase`;
        }

        const quantityPurchased = buyAmount / currentPrice;
        totalQuantityHeld += quantityPurchased;
        totalInvested += buyAmount;

        const coinValue = totalQuantityHeld * currentPrice;
        const usdcValue = investmentAmount - totalInvested;
        const totalValue = coinValue + usdcValue;

        transactions.push({
          date: candle.timestamp,
          price: currentPrice,
          amount: buyAmount,
          quantityPurchased,
          reason,
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

