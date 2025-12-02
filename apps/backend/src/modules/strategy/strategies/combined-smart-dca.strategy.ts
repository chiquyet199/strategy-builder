import { BaseStrategy } from './base.strategy';
import {
  StrategyResult,
  Transaction,
  InitialPortfolio,
  FundingSchedule,
} from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';
import { MetricsCalculator } from '../utils/metrics-calculator';
import { RsiCalculator } from '../utils/rsi-calculator';
import { MaCalculator } from '../utils/ma-calculator';
import { CombinedSmartDcaParameters } from '../interfaces/strategy-parameters.interface';

/**
 * Combined Smart DCA Strategy
 * Mix of RSI + Dip Buying + MA signals
 */
export class CombinedSmartDcaStrategy extends BaseStrategy {
  getStrategyId(): string {
    return 'combined-smart-dca';
  }

  getStrategyName(): string {
    return 'Combined Smart DCA';
  }

  getDefaultParameters(): Record<string, any> {
    return {
      rsiPeriod: 14,
      oversoldThreshold: 30,
      maPeriod: 200,
      lookbackDays: 30,
      dropThreshold: 0.1, // 10%
      maxMultiplier: 2.5,
    };
  }

  validateParameters(parameters?: Record<string, any>): void {
    if (!parameters) return;

    const params = parameters as CombinedSmartDcaParameters;

    if (params.rsiPeriod !== undefined) {
      if (params.rsiPeriod < 2 || params.rsiPeriod > 50) {
        throw new Error('RSI period must be between 2 and 50');
      }
    }

    if (params.oversoldThreshold !== undefined) {
      if (params.oversoldThreshold < 0 || params.oversoldThreshold > 50) {
        throw new Error('Oversold threshold must be between 0 and 50');
      }
    }

    if (params.maPeriod !== undefined) {
      if (params.maPeriod < 2 || params.maPeriod > 500) {
        throw new Error('MA period must be between 2 and 500');
      }
    }

    if (params.lookbackDays !== undefined) {
      if (params.lookbackDays < 1 || params.lookbackDays > 365) {
        throw new Error('Lookback days must be between 1 and 365');
      }
    }

    if (params.dropThreshold !== undefined) {
      if (params.dropThreshold < 0 || params.dropThreshold > 1) {
        throw new Error('Drop threshold must be between 0 and 1');
      }
    }

    if (params.maxMultiplier !== undefined) {
      if (params.maxMultiplier < 0.1 || params.maxMultiplier > 10) {
        throw new Error('Max multiplier must be between 0.1 and 10');
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
    const params = parameters as CombinedSmartDcaParameters;
    const rsiPeriod = params.rsiPeriod || 14;
    const oversoldThreshold = params.oversoldThreshold || 30;
    const maPeriod = params.maPeriod || 200;
    const lookbackDays = params.lookbackDays || 30;
    const dropThreshold = params.dropThreshold || 0.1;
    const maxMultiplier = params.maxMultiplier || 2.5;
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

    // Need enough candles for all indicators
    const minCandles = Math.max(rsiPeriod + 1, maPeriod, lookbackDays);
    if (candles.length < minCandles) {
      throw new Error(
        `Need at least ${minCandles} candles for combined strategy`,
      );
    }

    // Calculate indicators
    const rsiValues = RsiCalculator.calculate(candles, rsiPeriod);
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
    let totalInvested = 0; // Currently unused - using totalCapital instead
    let availableCash = initialUsdc;
    let totalFunding = 0;

    // Process each candle (start from max required period)
    const startIndex = Math.max(rsiPeriod, maPeriod - 1, lookbackDays - 1);
    for (let i = startIndex; i < candles.length; i++) {
      const candle = candles[i];
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
          const coinValue = totalQuantityHeld * candle.close;
          const usdcValue = availableCash;
          const totalValue = coinValue + usdcValue;

          transactions.push({
            date: candle.timestamp,
            type: 'funding',
            price: candle.close,
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
        let multiplier = 1.0;
        const reasons: string[] = [];

        // Check RSI signal
        const rsi = rsiValues[i];
        if (!isNaN(rsi) && rsi < oversoldThreshold) {
          multiplier += 0.5;
          reasons.push(`RSI < ${oversoldThreshold}`);
        }

        // Check MA signal
        const ma = maValues[i];
        const currentPrice = candle.close;
        if (!isNaN(ma) && currentPrice < ma) {
          multiplier += 0.5;
          reasons.push(`Price < ${maPeriod}-day MA`);
        }

        // Check dip signal
        const lookbackStart = Math.max(0, i - lookbackDays);
        const recentCandles = candles.slice(lookbackStart, i + 1);
        const recentHigh = Math.max(...recentCandles.map((c) => c.high));
        const dropPercent = (recentHigh - currentPrice) / recentHigh;
        if (dropPercent >= dropThreshold) {
          multiplier += 0.5;
          reasons.push(`${(dropPercent * 100).toFixed(2)}% dip`);
        }

        // Cap multiplier
        multiplier = Math.min(multiplier, maxMultiplier);

        const desiredBuyAmount = baseWeeklyAmount * multiplier;

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

        let reason =
          reasons.length > 0
            ? `Combined signals: ${reasons.join(', ')} - ${multiplier.toFixed(2)}x purchase`
            : 'Weekly DCA purchase';

        if (actualBuyAmount < desiredBuyAmount) {
          reason += ' (capped to available cash)';
        }

        const quantityPurchased = actualBuyAmount / currentPrice;
        totalQuantityHeld += quantityPurchased;
        totalInvested += actualBuyAmount;
        availableCash -= actualBuyAmount;

        const coinValue = totalQuantityHeld * currentPrice;
        const usdcValue = availableCash;
        const totalValue = coinValue + usdcValue;

        let finalReason = reason;
        if (actualBuyAmount < desiredBuyAmount) {
          finalReason += ' (capped to available cash)';
        }

        transactions.push({
          date: candle.timestamp,
          price: currentPrice,
          amount: actualBuyAmount,
          quantityPurchased,
          reason: finalReason,
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
