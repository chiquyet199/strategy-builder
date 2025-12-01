import { BaseStrategy } from './base.strategy';
import { StrategyResult, Transaction, InitialPortfolio, FundingSchedule } from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';
import { MetricsCalculator } from '../utils/metrics-calculator';

/**
 * Lump Sum Strategy
 * Buy entire investment amount at the start date, hold until end
 */
export class LumpSumStrategy extends BaseStrategy {
  getStrategyId(): string {
    return 'lump-sum';
  }

  getStrategyName(): string {
    return 'Lump Sum';
  }

  getDefaultParameters(): Record<string, any> {
    return {}; // No parameters for lump sum
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

    const initialPortfolio: InitialPortfolio | undefined = parameters._initialPortfolio;
    const fundingSchedule: FundingSchedule | undefined = parameters._fundingSchedule;
    const allowNegativeUsdc = parameters.allowNegativeUsdc ?? false;

    const firstCandle = candles[0];
    const firstCandlePrice = firstCandle.close;

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

    const transactions: Transaction[] = [];
    let totalQuantityHeld = initialAssetQuantity;
    let availableCash = initialUsdc;
    let totalInvested = 0; // Track total invested (for metrics)

    // If we have initial assets, no transaction needed
    // If we only have USDC, buy all at first candle
    if (initialAssetQuantity === 0 && availableCash > 0) {
      const price = firstCandle.close;
      const buyAmount = availableCash;
      const actualBuyAmount = this.calculatePurchaseAmount(buyAmount, availableCash, allowNegativeUsdc);

      if (actualBuyAmount > 0) {
        const quantityPurchased = actualBuyAmount / price;
        totalQuantityHeld += quantityPurchased;
        totalInvested += actualBuyAmount;
        availableCash -= actualBuyAmount;

        const coinValue = totalQuantityHeld * price;
        const usdcValue = availableCash;
        const totalValue = coinValue + usdcValue;

        transactions.push({
          date: firstCandle.timestamp,
          type: 'buy',
          price,
          amount: actualBuyAmount,
          quantityPurchased,
          reason: 'Initial lump sum purchase',
          portfolioValue: {
            coinValue,
            usdcValue,
            totalValue,
            quantityHeld: totalQuantityHeld,
          },
        });
      }
    }

    // Track total funding for metrics
    let totalFunding = 0;

    // Handle periodic funding
    if (fundingSchedule?.enabled && fundingSchedule.amount > 0) {
      const start = new Date(startDate);
      let lastFundingDate = new Date(start);
      lastFundingDate.setDate(lastFundingDate.getDate() - 1); // Initialize to before start

      const periodDays =
        fundingSchedule.frequency === 'daily'
          ? 1
          : fundingSchedule.frequency === 'weekly'
            ? 7
            : 30; // monthly

      for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];
        const candleDate = new Date(candle.timestamp);
        const daysSinceLastFunding = Math.floor(
          (candleDate.getTime() - lastFundingDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysSinceLastFunding >= periodDays) {
          // Add funding
          availableCash += fundingSchedule.amount;
          totalFunding += fundingSchedule.amount;
          lastFundingDate = new Date(candleDate);

          // Create a transaction to track funding (amount=0, but updates portfolio state)
          const coinValue = totalQuantityHeld * candle.close;
          const usdcValue = availableCash;
          const totalValue = coinValue + usdcValue;

          transactions.push({
            date: candle.timestamp,
            type: 'buy', // Using 'buy' type for funding
            price: candle.close,
            amount: fundingSchedule.amount, // Track funding amount
            quantityPurchased: 0, // No asset purchased, just cash added
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
    }

    // Build portfolio history (pass initial state)
    const portfolioHistory = MetricsCalculator.buildPortfolioHistory(
      transactions,
      candles,
      startDate,
      totalInitialValue,
      initialAssetQuantity,
      initialUsdc,
    );

    // Calculate total capital (initial + funding) for return calculations
    const totalCapital = totalInitialValue + totalFunding;

    // Calculate metrics
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

