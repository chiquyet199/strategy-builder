import { BaseStrategy } from './base.strategy';
import {
  StrategyResult,
  Transaction,
  InitialPortfolio,
  FundingSchedule,
} from '../interfaces/strategy-result.interface';
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

    const initialPortfolio: InitialPortfolio | undefined =
      parameters._initialPortfolio;
    const fundingSchedule: FundingSchedule | undefined =
      parameters._fundingSchedule;
    const params = parameters as MovingAverageDcaParameters;
    const maPeriod = params.maPeriod || 200;
    const buyMultiplier = params.buyMultiplier || 2.0;
    const allowNegativeUsdc = parameters.allowNegativeUsdc ?? false;

    const firstCandlePrice = candles[0].close;

    // Get initial state from portfolio or use investmentAmount (backward compatibility)
    let initialAssetQuantity = 0;
    let initialUsdc = investmentAmount;
    let totalInitialValue = investmentAmount;

    if (initialPortfolio) {
      const initialState = this.getInitialState(
        initialPortfolio,
        firstCandlePrice,
        'BTC',
      );
      initialAssetQuantity = initialState.initialAssetQuantity;
      initialUsdc = initialState.initialUsdc;
      totalInitialValue = initialState.totalInitialValue;
    }

    // Need enough candles for MA calculation
    if (candles.length < maPeriod) {
      throw new Error(
        `Need at least ${maPeriod} candles to calculate ${maPeriod}-period MA`,
      );
    }

    // Calculate MA for all candles
    const maValues = MaCalculator.calculate(candles, maPeriod);

    // Calculate base DCA amount (weekly) from initial USDC
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalWeeks = Math.ceil(totalDays / 7);
    const baseWeeklyAmount = initialUsdc / totalWeeks;

    const transactions: Transaction[] = [];
    let lastPurchaseDate = new Date(start);
    lastPurchaseDate.setDate(lastPurchaseDate.getDate() - 7);
    let lastFundingDate = new Date(start);
    lastFundingDate.setDate(lastFundingDate.getDate() - 1);
    let totalQuantityHeld = initialAssetQuantity;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const totalInvested = 0; // Currently unused - using totalCapital instead
    let availableCash = initialUsdc;
    let totalFunding = 0;

    // Process each candle (skip first maPeriod-1 candles as MA is not available)
    for (let i = maPeriod - 1; i < candles.length; i++) {
      const candle = candles[i];
      const ma = maValues[i];
      const currentPrice = candle.close;
      const candleDate = new Date(candle.timestamp);
      const daysSinceLastPurchase = Math.floor(
        (candleDate.getTime() - lastPurchaseDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Handle periodic funding (separate from DCA purchases)
      if (fundingSchedule && fundingSchedule.amount > 0) {
        const fundingPeriodDays =
          fundingSchedule.frequency === 'daily'
            ? 1
            : fundingSchedule.frequency === 'weekly'
              ? 7
              : 30; // monthly

        const daysSinceLastFunding = Math.floor(
          (candleDate.getTime() - lastFundingDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysSinceLastFunding >= fundingPeriodDays) {
          availableCash += fundingSchedule.amount;
          totalFunding += fundingSchedule.amount;
          lastFundingDate = new Date(candleDate);

          // Create funding transaction
          const coinValue = totalQuantityHeld * currentPrice;
          const usdcValue = availableCash;
          const totalValue = coinValue + usdcValue;

          transactions.push({
            date: candle.timestamp,
            type: 'funding',
            price: currentPrice,
            amount: fundingSchedule.amount,
            quantityPurchased: 0,
            reason: `Periodic funding: ${fundingSchedule.frequency} +$${fundingSchedule.amount}`,
            portfolioValue: {
              coinValue,
              usdcValue,
              totalValue,
              quantityHeld: totalQuantityHeld,
            },
          });
        }
      }

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
        // totalInvested += actualBuyAmount; // Currently unused - using totalCapital instead
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

    // Build portfolio history (pass initial state)
    const portfolioHistory = MetricsCalculator.buildPortfolioHistory(
      transactions,
      candles,
      startDate,
      totalInitialValue + totalFunding,
      initialAssetQuantity,
      initialUsdc,
    );

    // Calculate total capital (initial + funding) for return calculations
    const totalCapital = totalInitialValue + totalFunding;

    // Calculate metrics
    // Use totalCapital (total capital allocated including funding) not totalInvested (amount spent)
    // because return should be calculated against total capital, including remaining USDC
    const metrics = MetricsCalculator.calculate(
      transactions,
      portfolioHistory,
      totalCapital,
    );

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
