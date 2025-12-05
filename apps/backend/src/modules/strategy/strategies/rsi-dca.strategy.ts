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
import { RsiDcaParameters } from '../interfaces/strategy-parameters.interface';

/**
 * RSI DCA Strategy
 * Buy 2x when RSI < 30, normal when 30-70, skip when > 70
 */
export class RsiDcaStrategy extends BaseStrategy {
  getStrategyId(): string {
    return 'rsi-dca';
  }

  getStrategyName(): string {
    return 'RSI DCA';
  }

  getDefaultParameters(): Record<string, any> {
    return {
      rsiPeriod: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
      buyMultiplier: 2.0,
    };
  }

  validateParameters(parameters?: Record<string, any>): void {
    if (!parameters) return;

    const params = parameters as RsiDcaParameters;

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

    if (params.overboughtThreshold !== undefined) {
      if (params.overboughtThreshold < 50 || params.overboughtThreshold > 100) {
        throw new Error('Overbought threshold must be between 50 and 100');
      }
    }

    if (params.buyMultiplier !== undefined) {
      if (params.buyMultiplier < 0.1 || params.buyMultiplier > 10) {
        throw new Error('Buy multiplier must be between 0.1 and 10');
      }
    }

    if (
      params.oversoldThreshold !== undefined &&
      params.overboughtThreshold !== undefined
    ) {
      if (params.oversoldThreshold >= params.overboughtThreshold) {
        throw new Error(
          'Oversold threshold must be less than overbought threshold',
        );
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
    const params = parameters as RsiDcaParameters;
    const rsiPeriod = params.rsiPeriod || 14;
    const oversoldThreshold = params.oversoldThreshold || 30;
    const overboughtThreshold = params.overboughtThreshold || 70;
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

    // Need enough candles for RSI calculation
    if (candles.length < rsiPeriod + 1) {
      throw new Error(
        `Need at least ${rsiPeriod + 1} candles to calculate RSI`,
      );
    }

    // Calculate RSI for all candles
    const rsiValues = RsiCalculator.calculate(candles, rsiPeriod);

    // Calculate base DCA amount (weekly) from initial USDC
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalWeeks = Math.ceil(totalDays / 7);
    let baseWeeklyAmount = initialUsdc / totalWeeks;
    // If no initial USDC but funding is available, use funding amount as base weekly amount
    if (baseWeeklyAmount === 0 && fundingSchedule && fundingSchedule.amount > 0) {
      // Convert funding amount to weekly equivalent
      const fundingWeeklyAmount =
        fundingSchedule.frequency === 'daily'
          ? fundingSchedule.amount * 7
          : fundingSchedule.frequency === 'weekly'
            ? fundingSchedule.amount
            : fundingSchedule.amount / 4; // monthly to weekly
      baseWeeklyAmount = fundingWeeklyAmount;
    }

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

    // Process each candle (skip first rsiPeriod candles as RSI is not available)
    for (let i = rsiPeriod; i < candles.length; i++) {
      const candle = candles[i];
      const rsi = rsiValues[i];
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

      // Skip if RSI is overbought
      if (rsi > overboughtThreshold) {
        continue;
      }

      // Buy every 7 days (weekly base)
      if (daysSinceLastPurchase >= 7) {
        let desiredBuyAmount = baseWeeklyAmount;
        let reason = 'Weekly DCA purchase';

        // Adjust buy amount based on RSI
        if (rsi < oversoldThreshold) {
          desiredBuyAmount = baseWeeklyAmount * buyMultiplier;
          reason = `RSI < ${oversoldThreshold} (${rsi.toFixed(2)}) - ${buyMultiplier}x purchase`;
        } else {
          reason = `RSI ${rsi.toFixed(2)} - normal purchase`;
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

        const price = candle.close;
        const quantityPurchased = actualBuyAmount / price;
        totalQuantityHeld += quantityPurchased;
        // totalInvested += actualBuyAmount; // Currently unused - using totalCapital instead
        availableCash -= actualBuyAmount;

        const coinValue = totalQuantityHeld * price;
        const usdcValue = availableCash;
        const totalValue = coinValue + usdcValue;

        if (actualBuyAmount < desiredBuyAmount) {
          reason += ' (capped to available cash)';
        }

        transactions.push({
          date: candle.timestamp,
          type: 'buy',
          price,
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
