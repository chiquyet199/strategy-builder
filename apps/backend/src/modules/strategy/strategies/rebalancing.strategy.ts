import { BaseStrategy } from './base.strategy';
import { StrategyResult, Transaction } from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';
import { MetricsCalculator } from '../utils/metrics-calculator';

/**
 * Rebalancing Strategy
 * Maintains a target asset allocation (e.g., 80% BTC / 20% USDC) by automatically
 * buying or selling when the allocation drifts beyond configurable thresholds.
 */
export class RebalancingStrategy extends BaseStrategy {
  getStrategyId(): string {
    return 'rebalancing';
  }

  getStrategyName(): string {
    return 'Portfolio Rebalancing';
  }

  getDefaultParameters(): Record<string, any> {
    return {
      targetAllocation: 0.8, // 80% BTC, 20% USDC
      rebalanceThreshold: 0.1, // 10% drift threshold
    };
  }

  validateParameters(parameters?: Record<string, any>): void {
    if (!parameters) return;

    if (parameters.targetAllocation !== undefined) {
      if (
        parameters.targetAllocation < 0 ||
        parameters.targetAllocation > 1
      ) {
        throw new Error('Target allocation must be between 0 and 1 (0% to 100%)');
      }
    }

    if (parameters.rebalanceThreshold !== undefined) {
      if (
        parameters.rebalanceThreshold < 0 ||
        parameters.rebalanceThreshold > 1
      ) {
        throw new Error(
          'Rebalance threshold must be between 0 and 1 (0% to 100%)',
        );
      }
    }

    // Ensure threshold doesn't exceed allocation bounds
    if (
      parameters.targetAllocation !== undefined &&
      parameters.rebalanceThreshold !== undefined
    ) {
      if (
        parameters.targetAllocation - parameters.rebalanceThreshold < 0 ||
        parameters.targetAllocation + parameters.rebalanceThreshold > 1
      ) {
        throw new Error(
          'Rebalance threshold would cause allocation to go below 0% or above 100%',
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

    const targetAllocation = parameters.targetAllocation ?? 0.8;
    const rebalanceThreshold = parameters.rebalanceThreshold ?? 0.1;
    const allowNegativeUsdc = parameters.allowNegativeUsdc ?? false;

    const transactions: Transaction[] = [];
    let totalQuantityHeld = 0;
    let availableCash = investmentAmount; // Start with all cash
    let totalInvested = 0; // Track amount spent on buys
    let totalSold = 0; // Track amount received from sells

    const upperThreshold = targetAllocation + rebalanceThreshold;
    const lowerThreshold = targetAllocation - rebalanceThreshold;

    // Process each candle
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const price = candle.close;
      const currentCoinValue = totalQuantityHeld * price;
      const currentTotalValue = currentCoinValue + availableCash;
      const currentAllocation =
        currentTotalValue > 0 ? currentCoinValue / currentTotalValue : 0;

      // First candle: buy to reach target allocation
      if (i === 0) {
        const targetCoinValue = investmentAmount * targetAllocation;
        const buyAmount = targetCoinValue;
        const actualBuyAmount = this.calculatePurchaseAmount(
          buyAmount,
          availableCash,
          allowNegativeUsdc,
        );

        if (actualBuyAmount > 0) {
          const quantityPurchased = actualBuyAmount / price;
          totalQuantityHeld += quantityPurchased;
          totalInvested += actualBuyAmount;
          availableCash -= actualBuyAmount;

          const coinValue = totalQuantityHeld * price;
          const usdcValue = availableCash;
          const totalValue = coinValue + usdcValue;

          transactions.push({
            date: candle.timestamp,
            type: 'buy',
            price,
            amount: actualBuyAmount,
            quantityPurchased,
            reason: `Initial allocation: Buy to reach ${(targetAllocation * 100).toFixed(0)}% BTC allocation`,
            portfolioValue: {
              coinValue,
              usdcValue,
              totalValue,
              quantityHeld: totalQuantityHeld,
            },
          });
        }
        continue;
      }

      // Subsequent candles: check if rebalancing is needed
      if (currentTotalValue <= 0) {
        continue; // Skip if portfolio has no value
      }

      const targetCoinValue = currentTotalValue * targetAllocation;
      const targetUsdcValue = currentTotalValue * (1 - targetAllocation);

      // Check if rebalancing is needed
      if (currentAllocation > upperThreshold) {
        // BTC allocation too high: SELL BTC
        const excessCoinValue = currentCoinValue - targetCoinValue;
        const btcToSell = excessCoinValue / price;

        if (btcToSell > 0 && totalQuantityHeld >= btcToSell) {
          const sellAmount = excessCoinValue; // USD received from sale
          const quantitySold = btcToSell;

          totalQuantityHeld -= quantitySold;
          totalSold += sellAmount;
          availableCash += sellAmount;

          const coinValue = totalQuantityHeld * price;
          const usdcValue = availableCash;
          const totalValue = coinValue + usdcValue;

          transactions.push({
            date: candle.timestamp,
            type: 'sell',
            price,
            amount: sellAmount,
            quantityPurchased: -quantitySold, // Negative for sells
            reason: `Rebalancing: BTC allocation ${(currentAllocation * 100).toFixed(2)}% > ${(upperThreshold * 100).toFixed(0)}% threshold`,
            portfolioValue: {
              coinValue,
              usdcValue,
              totalValue,
              quantityHeld: totalQuantityHeld,
            },
          });
        }
      } else if (currentAllocation < lowerThreshold) {
        // BTC allocation too low: BUY BTC
        const deficitCoinValue = targetCoinValue - currentCoinValue;
        const buyAmount = deficitCoinValue;

        const actualBuyAmount = this.calculatePurchaseAmount(
          buyAmount,
          availableCash,
          allowNegativeUsdc,
        );

        if (actualBuyAmount > 0) {
          const quantityPurchased = actualBuyAmount / price;
          totalQuantityHeld += quantityPurchased;
          totalInvested += actualBuyAmount;
          availableCash -= actualBuyAmount;

          const coinValue = totalQuantityHeld * price;
          const usdcValue = availableCash;
          const totalValue = coinValue + usdcValue;

          let reason = `Rebalancing: BTC allocation ${(currentAllocation * 100).toFixed(2)}% < ${(lowerThreshold * 100).toFixed(0)}% threshold`;
          if (actualBuyAmount < buyAmount) {
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
        }
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
    const metrics = MetricsCalculator.calculate(
      transactions,
      portfolioHistory,
      investmentAmount,
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

