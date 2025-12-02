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
 * Rebalancing Strategy
 * Maintains a target asset allocation (e.g., 80% BTC / 20% USDC) by automatically
 * buying or selling when the allocation drifts beyond configurable thresholds or on a schedule.
 */

interface RebalancingState {
  totalQuantityHeld: number;
  availableCash: number;
  totalInvested: number;
  totalSold: number;
  totalFunding: number;
  lastFundingDate: Date;
  lastRebalanceDate: Date;
}

interface PortfolioSnapshot {
  coinValue: number;
  usdcValue: number;
  totalValue: number;
  quantityHeld: number;
}

interface RebalancingCheckResult {
  shouldRebalance: boolean;
  shouldRebalanceBySchedule: boolean;
  shouldRebalanceByThreshold: boolean;
  rebalanceReason: string;
}

/**
 * Calculate portfolio snapshot at current price
 */
function calculatePortfolioSnapshot(
  quantityHeld: number,
  availableCash: number,
  price: number,
): PortfolioSnapshot {
  const coinValue = quantityHeld * price;
  const totalValue = coinValue + availableCash;
  return {
    coinValue,
    usdcValue: availableCash,
    totalValue,
    quantityHeld,
  };
}

/**
 * Calculate current asset allocation percentage
 */
function calculateAllocation(
  quantityHeld: number,
  availableCash: number,
  price: number,
): number {
  const totalValue = quantityHeld * price + availableCash;
  return totalValue > 0 ? (quantityHeld * price) / totalValue : 0;
}

/**
 * Get days for funding frequency
 */
function getFundingPeriodDays(
  frequency: 'daily' | 'weekly' | 'monthly',
): number {
  switch (frequency) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
  }
}

/**
 * Get days for rebalance schedule
 */
function getRebalanceScheduleDays(
  schedule: 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly',
): number {
  switch (schedule) {
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
    case 'quarterly':
      return 90; // ~3 months
    case 'half-yearly':
      return 180; // ~6 months
    case 'yearly':
      return 365; // ~1 year
  }
}

/**
 * Check if periodic funding should be added
 */
function shouldAddFunding(
  fundingSchedule: FundingSchedule | undefined,
  candleDate: Date,
  lastFundingDate: Date,
  candleIndex: number,
): boolean {
  if (!fundingSchedule || fundingSchedule.amount <= 0 || candleIndex === 0) {
    return false;
  }

  const periodDays = getFundingPeriodDays(fundingSchedule.frequency);
  const daysSinceLastFunding = Math.floor(
    (candleDate.getTime() - lastFundingDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return daysSinceLastFunding >= periodDays;
}

/**
 * Create a funding transaction
 */
function createFundingTransaction(
  timestamp: string,
  price: number,
  fundingAmount: number,
  frequency: string,
  quantityHeld: number,
  availableCash: number,
): Transaction {
  const snapshot = calculatePortfolioSnapshot(
    quantityHeld,
    availableCash,
    price,
  );
  return {
    date: timestamp,
    type: 'funding',
    price,
    amount: fundingAmount,
    quantityPurchased: 0,
    reason: `Periodic funding: ${frequency} +$${fundingAmount}`,
    portfolioValue: snapshot,
  };
}

/**
 * Check if rebalancing is needed based on schedule and threshold
 */
function checkRebalancingNeeded(
  rebalanceSchedule:
    | 'none'
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'half-yearly'
    | 'yearly',
  currentAllocation: number,
  upperThreshold: number,
  lowerThreshold: number,
  candleDate: Date,
  lastRebalanceDate: Date,
): RebalancingCheckResult {
  // Check schedule-based rebalancing
  let shouldRebalanceBySchedule = false;
  if (rebalanceSchedule !== 'none') {
    const scheduleDays = getRebalanceScheduleDays(rebalanceSchedule);
    const daysSinceLastRebalance = Math.floor(
      (candleDate.getTime() - lastRebalanceDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    shouldRebalanceBySchedule = daysSinceLastRebalance >= scheduleDays;
  }

  // Check threshold-based rebalancing
  const shouldRebalanceByThreshold =
    currentAllocation > upperThreshold || currentAllocation < lowerThreshold;

  // Determine reason
  let rebalanceReason = '';
  if (shouldRebalanceBySchedule && shouldRebalanceByThreshold) {
    rebalanceReason = `Scheduled rebalance (${rebalanceSchedule}) + threshold breach`;
  } else if (shouldRebalanceBySchedule) {
    rebalanceReason = `Scheduled rebalance (${rebalanceSchedule})`;
  } else if (shouldRebalanceByThreshold) {
    if (currentAllocation > upperThreshold) {
      rebalanceReason = `Rebalancing: Asset allocation ${(currentAllocation * 100).toFixed(2)}% > ${(upperThreshold * 100).toFixed(0)}% threshold`;
    } else {
      rebalanceReason = `Rebalancing: Asset allocation ${(currentAllocation * 100).toFixed(2)}% < ${(lowerThreshold * 100).toFixed(0)}% threshold`;
    }
  }

  return {
    shouldRebalance: shouldRebalanceBySchedule || shouldRebalanceByThreshold,
    shouldRebalanceBySchedule,
    shouldRebalanceByThreshold,
    rebalanceReason,
  };
}

/**
 * Create a sell transaction for rebalancing
 */
function createSellTransaction(
  timestamp: string,
  price: number,
  sellAmount: number,
  quantitySold: number,
  reason: string,
  quantityHeld: number,
  availableCash: number,
): Transaction {
  const snapshot = calculatePortfolioSnapshot(
    quantityHeld,
    availableCash,
    price,
  );
  const newAllocation =
    snapshot.totalValue > 0 ? snapshot.coinValue / snapshot.totalValue : 0;
  return {
    date: timestamp,
    type: 'sell',
    price,
    amount: sellAmount,
    quantityPurchased: -quantitySold,
    reason: `${reason} (rebalanced to ${(newAllocation * 100).toFixed(2)}%)`,
    portfolioValue: snapshot,
  };
}

/**
 * Create a buy transaction for rebalancing
 */
function createBuyTransaction(
  timestamp: string,
  price: number,
  buyAmount: number,
  quantityPurchased: number,
  reason: string,
  quantityHeld: number,
  availableCash: number,
  wasCapped: boolean,
): Transaction {
  const snapshot = calculatePortfolioSnapshot(
    quantityHeld,
    availableCash,
    price,
  );
  const newAllocation =
    snapshot.totalValue > 0 ? snapshot.coinValue / snapshot.totalValue : 0;
  let finalReason = reason;
  if (wasCapped) {
    finalReason += ' (capped to available cash)';
  }
  finalReason += ` (rebalanced to ${(newAllocation * 100).toFixed(2)}%)`;
  return {
    date: timestamp,
    type: 'buy',
    price,
    amount: buyAmount,
    quantityPurchased,
    reason: finalReason,
    portfolioValue: snapshot,
  };
}

/**
 * Execute a sell rebalancing action
 */
function executeSellRebalancing(
  excessCoinValue: number,
  price: number,
  state: RebalancingState,
): {
  success: boolean;
  transaction: Transaction | null;
  updatedState: RebalancingState;
} {
  const quantityToSell = excessCoinValue / price;

  if (quantityToSell <= 0 || state.totalQuantityHeld < quantityToSell) {
    return { success: false, transaction: null, updatedState: state };
  }

  const sellAmount = excessCoinValue;
  const newQuantityHeld = state.totalQuantityHeld - quantityToSell;
  const newAvailableCash = state.availableCash + sellAmount;

  return {
    success: true,
    transaction: createSellTransaction(
      '', // Will be set by caller
      price,
      sellAmount,
      quantityToSell,
      '', // Will be set by caller
      newQuantityHeld,
      newAvailableCash,
    ),
    updatedState: {
      ...state,
      totalQuantityHeld: newQuantityHeld,
      availableCash: newAvailableCash,
      totalSold: state.totalSold + sellAmount,
    },
  };
}

/**
 * Execute a buy rebalancing action
 */
function executeBuyRebalancing(
  deficitCoinValue: number,
  price: number,
  state: RebalancingState,
  allowNegativeUsdc: boolean,
  calculatePurchaseAmount: (
    amount: number,
    cash: number,
    allowNegative: boolean,
  ) => number,
): {
  success: boolean;
  transaction: Transaction | null;
  updatedState: RebalancingState;
} {
  const buyAmount = deficitCoinValue;
  const actualBuyAmount = calculatePurchaseAmount(
    buyAmount,
    state.availableCash,
    allowNegativeUsdc,
  );

  if (actualBuyAmount <= 0) {
    return { success: false, transaction: null, updatedState: state };
  }

  const quantityPurchased = actualBuyAmount / price;
  const newQuantityHeld = state.totalQuantityHeld + quantityPurchased;
  const newAvailableCash = state.availableCash - actualBuyAmount;
  const wasCapped = actualBuyAmount < buyAmount;

  return {
    success: true,
    transaction: createBuyTransaction(
      '', // Will be set by caller
      price,
      actualBuyAmount,
      quantityPurchased,
      '', // Will be set by caller
      newQuantityHeld,
      newAvailableCash,
      wasCapped,
    ),
    updatedState: {
      ...state,
      totalQuantityHeld: newQuantityHeld,
      availableCash: newAvailableCash,
      totalInvested: state.totalInvested + actualBuyAmount,
    },
  };
}

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
      rebalanceSchedule: 'none', // 'none', 'weekly', 'monthly', 'quarterly', 'half-yearly', or 'yearly' - rebalance on schedule
    };
  }

  validateParameters(parameters?: Record<string, any>): void {
    if (!parameters) return;

    if (parameters.targetAllocation !== undefined) {
      if (parameters.targetAllocation < 0 || parameters.targetAllocation > 1) {
        throw new Error(
          'Target allocation must be between 0 and 1 (0% to 100%)',
        );
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

    if (parameters.rebalanceSchedule !== undefined) {
      if (
        !['none', 'weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'].includes(
          parameters.rebalanceSchedule,
        )
      ) {
        throw new Error(
          'Rebalance schedule must be "none", "weekly", "monthly", "quarterly", "half-yearly", or "yearly"',
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
    const targetAllocation = parameters.targetAllocation ?? 0.8;
    const rebalanceThreshold = parameters.rebalanceThreshold ?? 0.1;
    const rebalanceSchedule = parameters.rebalanceSchedule ?? 'none';
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

    // Initialize state
    const state: RebalancingState = {
      totalQuantityHeld: initialAssetQuantity,
      availableCash: initialUsdc,
      totalInvested: 0,
      totalSold: 0,
      totalFunding: 0,
      lastFundingDate: (() => {
        const date = new Date(startDate);
        date.setDate(date.getDate() - 1);
        return date;
      })(),
      lastRebalanceDate: (() => {
        const date = new Date(startDate);
        date.setDate(date.getDate() - 1);
        return date;
      })(),
    };

    const transactions: Transaction[] = [];
    const upperThreshold = targetAllocation + rebalanceThreshold;
    const lowerThreshold = targetAllocation - rebalanceThreshold;

    // Process each candle
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const price = candle.close;
      const candleDate = new Date(candle.timestamp);

      // Handle periodic funding
      if (
        shouldAddFunding(fundingSchedule, candleDate, state.lastFundingDate, i)
      ) {
        state.availableCash += fundingSchedule!.amount;
        state.totalFunding += fundingSchedule!.amount;
        state.lastFundingDate = new Date(candleDate);

        const fundingTransaction = createFundingTransaction(
          candle.timestamp,
          price,
          fundingSchedule!.amount,
          fundingSchedule!.frequency,
          state.totalQuantityHeld,
          state.availableCash,
        );
        transactions.push(fundingTransaction);
      }

      // Calculate current allocation
      const currentAllocation = calculateAllocation(
        state.totalQuantityHeld,
        state.availableCash,
        price,
      );
      const currentTotalValue =
        state.totalQuantityHeld * price + state.availableCash;

      // First candle: initial allocation
      if (i === 0) {
        const targetCoinValue = currentTotalValue * targetAllocation;
        const currentCoinValue = state.totalQuantityHeld * price;
        const buyAmount = targetCoinValue - currentCoinValue;

        if (buyAmount > 0) {
          const actualBuyAmount = this.calculatePurchaseAmount(
            buyAmount,
            state.availableCash,
            allowNegativeUsdc,
          );

          if (actualBuyAmount > 0) {
            const quantityPurchased = actualBuyAmount / price;
            state.totalQuantityHeld += quantityPurchased;
            state.totalInvested += actualBuyAmount;
            state.availableCash -= actualBuyAmount;

            const buyTransaction = createBuyTransaction(
              candle.timestamp,
              price,
              actualBuyAmount,
              quantityPurchased,
              `Initial allocation: Buy to reach ${(targetAllocation * 100).toFixed(0)}% asset allocation`,
              state.totalQuantityHeld,
              state.availableCash,
              false,
            );
            transactions.push(buyTransaction);
          }
        }
        continue;
      }

      // Skip if portfolio has no value
      if (currentTotalValue <= 0) {
        continue;
      }

      // Check if rebalancing is needed
      const rebalanceCheck = checkRebalancingNeeded(
        rebalanceSchedule,
        currentAllocation,
        upperThreshold,
        lowerThreshold,
        candleDate,
        state.lastRebalanceDate,
      );

      if (!rebalanceCheck.shouldRebalance) {
        continue;
      }

      const targetCoinValue = currentTotalValue * targetAllocation;
      const currentCoinValue = state.totalQuantityHeld * price;

      // Execute rebalancing based on allocation
      if (currentAllocation > upperThreshold) {
        // Allocation too high: SELL
        const excessCoinValue = currentCoinValue - targetCoinValue;
        const sellResult = executeSellRebalancing(
          excessCoinValue,
          price,
          state,
        );

        if (sellResult.success && sellResult.transaction) {
          Object.assign(state, sellResult.updatedState);
          sellResult.transaction.date = candle.timestamp;
          sellResult.transaction.reason = rebalanceCheck.rebalanceReason;
          transactions.push(sellResult.transaction);
          state.lastRebalanceDate = new Date(candleDate);
        }
      } else if (currentAllocation < lowerThreshold) {
        // Allocation too low: BUY
        const deficitCoinValue = targetCoinValue - currentCoinValue;
        const buyResult = executeBuyRebalancing(
          deficitCoinValue,
          price,
          state,
          allowNegativeUsdc,
          (amount, cash, allowNegative) =>
            this.calculatePurchaseAmount(amount, cash, allowNegative),
        );

        if (buyResult.success && buyResult.transaction) {
          Object.assign(state, buyResult.updatedState);
          buyResult.transaction.date = candle.timestamp;
          buyResult.transaction.reason = rebalanceCheck.rebalanceReason;
          transactions.push(buyResult.transaction);
          state.lastRebalanceDate = new Date(candleDate);
        }
      } else {
        // Schedule-based rebalancing when allocation is within threshold
        const deficitCoinValue = targetCoinValue - currentCoinValue;

        if (Math.abs(deficitCoinValue) > 0.01) {
          // Only rebalance if there's a meaningful difference
          if (deficitCoinValue > 0) {
            // Need to buy
            const buyResult = executeBuyRebalancing(
              deficitCoinValue,
              price,
              state,
              allowNegativeUsdc,
              (amount, cash, allowNegative) =>
                this.calculatePurchaseAmount(amount, cash, allowNegative),
            );

            if (buyResult.success && buyResult.transaction) {
              Object.assign(state, buyResult.updatedState);
              buyResult.transaction.date = candle.timestamp;
              buyResult.transaction.reason = rebalanceCheck.rebalanceReason;
              transactions.push(buyResult.transaction);
              state.lastRebalanceDate = new Date(candleDate);
            }
          } else {
            // Need to sell
            const excessCoinValue = Math.abs(deficitCoinValue);
            const sellResult = executeSellRebalancing(
              excessCoinValue,
              price,
              state,
            );

            if (sellResult.success && sellResult.transaction) {
              Object.assign(state, sellResult.updatedState);
              sellResult.transaction.date = candle.timestamp;
              sellResult.transaction.reason = rebalanceCheck.rebalanceReason;
              transactions.push(sellResult.transaction);
              state.lastRebalanceDate = new Date(candleDate);
            }
          }
        } else {
          // Already at target, just update the date
          state.lastRebalanceDate = new Date(candleDate);
        }
      }
    }

    // Build portfolio history
    const portfolioHistory = MetricsCalculator.buildPortfolioHistory(
      transactions,
      candles,
      startDate,
      totalInitialValue + state.totalFunding,
      initialAssetQuantity,
      initialUsdc,
    );

    // Calculate total capital (initial + funding) for return calculations
    const totalCapital = totalInitialValue + state.totalFunding;

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
