import { BaseStrategy } from './base.strategy';
import { StrategyResult, Transaction } from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';
import { MetricsCalculator } from '../utils/metrics-calculator';
import { MaCalculator } from '../utils/ma-calculator';
import { MovingAverageDcaParameters } from '../interfaces/strategy-parameters.interface';

/**
 * Moving Average DCA Strategy
 * Buy 2x when price < 200-day MA
 */
export class MovingAverageDcaStrategy extends BaseStrategy {
  getStrategyId(): string {
    return 'moving-average-dca';
  }

  getStrategyName(): string {
    return 'Moving Average DCA';
  }

  getDefaultParameters(): Record<string, any> {
    return {
      maPeriod: 200,
      buyMultiplier: 2.0,
    };
  }

  validateParameters(parameters?: Record<string, any>): void {
    if (!parameters) return;

    const params = parameters as MovingAverageDcaParameters;

    if (params.maPeriod !== undefined) {
      if (params.maPeriod < 2 || params.maPeriod > 500) {
        throw new Error('MA period must be between 2 and 500');
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

    const params = parameters as MovingAverageDcaParameters;
    const maPeriod = params.maPeriod || 200;
    const buyMultiplier = params.buyMultiplier || 2.0;

    // Need enough candles for MA calculation
    if (candles.length < maPeriod) {
      throw new Error(`Need at least ${maPeriod} candles to calculate ${maPeriod}-period MA`);
    }

    // Calculate MA for all candles
    const maValues = MaCalculator.calculate(candles, maPeriod);

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
    let availableCash = investmentAmount; // Track available cash
    const allowNegativeUsdc = parameters.allowNegativeUsdc ?? false;

    // Process each candle (skip first maPeriod-1 candles as MA is not available)
    for (let i = maPeriod - 1; i < candles.length; i++) {
      const candle = candles[i];
      const ma = maValues[i];
      const currentPrice = candle.close;
      const candleDate = new Date(candle.timestamp);
      const daysSinceLastPurchase = Math.floor(
        (candleDate.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Buy every 7 days (weekly base)
      if (daysSinceLastPurchase >= 7) {
        let desiredBuyAmount = baseWeeklyAmount;
        let reason = 'Weekly DCA purchase';

        // Check if price is below MA
        if (currentPrice < ma) {
          desiredBuyAmount = baseWeeklyAmount * buyMultiplier;
          reason = `Price below ${maPeriod}-day MA (${currentPrice.toFixed(2)} < ${ma.toFixed(2)}) - ${buyMultiplier}x purchase`;
        } else {
          reason = `Price above ${maPeriod}-day MA - normal purchase`;
        }

        // Calculate actual purchase amount (capped to available cash if negative USDC not allowed)
        const actualBuyAmount = this.calculatePurchaseAmount(
          desiredBuyAmount,
          availableCash,
          allowNegativeUsdc,
        );

        // Skip purchase if no cash available and negative USDC not allowed
        if (actualBuyAmount <= 0 && !allowNegativeUsdc) {
          continue;
        }

        const quantityPurchased = actualBuyAmount / currentPrice;
        totalQuantityHeld += quantityPurchased;
        totalInvested += actualBuyAmount;
        availableCash -= actualBuyAmount;

        const coinValue = totalQuantityHeld * currentPrice;
        const usdcValue = availableCash;
        const totalValue = coinValue + usdcValue;

        if (actualBuyAmount < desiredBuyAmount) {
          reason += ' (capped to available cash)';
        }

        transactions.push({
          date: candle.timestamp,
          price: currentPrice,
          amount: actualBuyAmount,
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
      investmentAmount,
    );

    // Calculate metrics
    // Use investmentAmount (total capital allocated) not totalInvested (amount spent)
    // because return should be calculated against total capital, including remaining USDC
    const metrics = MetricsCalculator.calculate(transactions, portfolioHistory, investmentAmount);

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

