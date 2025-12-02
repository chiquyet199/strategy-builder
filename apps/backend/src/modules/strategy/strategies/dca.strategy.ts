import { BaseStrategy } from './base.strategy';
import {
  StrategyResult,
  Transaction,
  InitialPortfolio,
  FundingSchedule,
} from '../interfaces/strategy-result.interface';
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
        throw new Error(
          `Frequency must be one of: ${validFrequencies.join(', ')}`,
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
    const frequency = parameters.frequency || 'weekly';
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

    const transactions: Transaction[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate number of periods based on frequency
    let totalPeriods: number;
    let periodDays: number;

    switch (frequency) {
      case 'daily':
        totalPeriods = Math.ceil(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
        );
        periodDays = 1;
        break;
      case 'weekly':
        totalPeriods = Math.ceil(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7),
        );
        periodDays = 7;
        break;
      case 'monthly':
        const monthsDiff =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1;
        totalPeriods = monthsDiff;
        periodDays = 30; // Approximate
        break;
      default:
        totalPeriods = Math.ceil(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7),
        );
        periodDays = 7;
    }

    // DCA period amount is calculated from initial USDC (not including funding)
    const periodAmount = initialUsdc / totalPeriods;

    let currentQuantityHeld = initialAssetQuantity;
    let currentUsdcBalance = initialUsdc;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const totalInvested = 0; // Currently unused - using totalCapital instead
    let totalFunding = 0; // Track total funding added

    // Track last purchase date and last funding date
    let lastPurchaseDate = new Date(start);
    lastPurchaseDate.setDate(lastPurchaseDate.getDate() - periodDays); // Initialize to before start
    let lastFundingDate = new Date(start);
    lastFundingDate.setDate(lastFundingDate.getDate() - 1); // Initialize to before start

    // Process each candle
    for (const candle of candles) {
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
          currentUsdcBalance += fundingSchedule.amount;
          totalFunding += fundingSchedule.amount;
          lastFundingDate = new Date(candleDate);

          // Create funding transaction
          const coinValue = currentQuantityHeld * candle.close;
          const usdcValue = currentUsdcBalance;
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
              quantityHeld: currentQuantityHeld,
            },
          });
        }
      }

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
          shouldPurchase = true;
        }
      }

      if (shouldPurchase) {
        const price = candle.close;

        // Calculate actual purchase amount (capped to available cash if negative USDC not allowed)
        const actualPurchaseAmount = this.calculatePurchaseAmount(
          periodAmount,
          currentUsdcBalance,
          allowNegativeUsdc,
        );

        // Skip purchase if no cash available and negative USDC not allowed
        if (actualPurchaseAmount <= 0 && !allowNegativeUsdc) {
          continue;
        }

        const quantityPurchased = actualPurchaseAmount / price;

        currentQuantityHeld += quantityPurchased;
        currentUsdcBalance -= actualPurchaseAmount;
        // totalInvested += actualPurchaseAmount; // Currently unused - using totalCapital instead

        const coinValue = currentQuantityHeld * price;
        const totalValue = coinValue + currentUsdcBalance;

        transactions.push({
          date: candle.timestamp,
          price,
          amount: actualPurchaseAmount,
          quantityPurchased,
          reason: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} DCA purchase${actualPurchaseAmount < periodAmount ? ' (capped to available cash)' : ''}`,
          portfolioValue: {
            coinValue,
            usdcValue: currentUsdcBalance,
            totalValue,
            quantityHeld: currentQuantityHeld,
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
