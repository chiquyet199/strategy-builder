import { BaseStrategy } from './base.strategy';
import { StrategyResult, Transaction, InitialPortfolio, FundingSchedule } from '../interfaces/strategy-result.interface';
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

    const initialPortfolio: InitialPortfolio | undefined = parameters._initialPortfolio;
    const fundingSchedule: FundingSchedule | undefined = parameters._fundingSchedule;
    const params = parameters as DipBuyerDcaParameters;
    const lookbackDays = params.lookbackDays || 30;
    const dropThreshold = params.dropThreshold || 0.10;
    const buyMultiplier = params.buyMultiplier || 2.0;
    const allowNegativeUsdc = parameters.allowNegativeUsdc ?? false;

    const firstCandlePrice = candles[0].close;

    // Get initial state from portfolio or use investmentAmount (backward compatibility)
    let initialAssetQuantity = 0;
    let initialUsdc = investmentAmount;
    let totalInitialValue = investmentAmount;

    if (initialPortfolio) {
      const initialState = this.getInitialState(initialPortfolio, firstCandlePrice, 'BTC');
      initialAssetQuantity = initialState.initialAssetQuantity;
      initialUsdc = initialState.initialUsdc;
      totalInitialValue = initialState.totalInitialValue;
    }

    // Calculate base DCA amount (weekly) from initial USDC
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.ceil(totalDays / 7);
    const baseWeeklyAmount = initialUsdc / totalWeeks;

    const transactions: Transaction[] = [];
    let lastPurchaseDate = new Date(start);
    lastPurchaseDate.setDate(lastPurchaseDate.getDate() - 7);
    let lastFundingDate = new Date(start);
    lastFundingDate.setDate(lastFundingDate.getDate() - 1);
    let totalQuantityHeld = initialAssetQuantity;
    let totalInvested = 0;
    let availableCash = initialUsdc;
    let totalFunding = 0;

    // Process each candle
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const candleDate = new Date(candle.timestamp);
      const daysSinceLastPurchase = Math.floor(
        (candleDate.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24),
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
          (candleDate.getTime() - lastFundingDate.getTime()) / (1000 * 60 * 60 * 24),
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

      // Calculate recent high (lookback period)
      const lookbackStart = Math.max(0, i - lookbackDays);
      const recentCandles = candles.slice(lookbackStart, i + 1);
      const recentHigh = Math.max(...recentCandles.map((c) => c.high));
      const currentPrice = candle.close;

      // Calculate drop percentage
      const dropPercent = (recentHigh - currentPrice) / recentHigh;

      // Buy every 7 days (weekly base)
      if (daysSinceLastPurchase >= 7) {
        let desiredBuyAmount = baseWeeklyAmount;
        let reason = 'Weekly DCA purchase';

        // Check if we're in a dip
        if (dropPercent >= dropThreshold) {
          desiredBuyAmount = baseWeeklyAmount * buyMultiplier;
          reason = `Dip detected: ${(dropPercent * 100).toFixed(2)}% drop from recent high - ${buyMultiplier}x purchase`;
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
    const metrics = MetricsCalculator.calculate(transactions, portfolioHistory, totalCapital);

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

