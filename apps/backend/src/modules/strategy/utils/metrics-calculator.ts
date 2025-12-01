import { Transaction, PortfolioValuePoint, StrategyMetrics } from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

/**
 * Metrics Calculator
 * Calculates performance metrics for a strategy
 */
export class MetricsCalculator {
  /**
   * Calculate all metrics for a strategy
   */
  static calculate(
    transactions: Transaction[],
    portfolioHistory: PortfolioValuePoint[],
    totalInvestment: number,
  ): StrategyMetrics {
    if (portfolioHistory.length === 0) {
      throw new Error('Portfolio history is empty');
    }

    const finalValue = portfolioHistory[portfolioHistory.length - 1].value;
    const totalQuantity = portfolioHistory[portfolioHistory.length - 1].quantityHeld;

    // Calculate total amount spent on buys only (for average buy price)
    // Only count buy transactions (type === 'buy' or type is undefined for backward compatibility)
    const buyTransactions = transactions.filter(
      (tx) => !tx.type || tx.type === 'buy',
    );
    const totalAmountSpentOnCoins = buyTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );

    // Total return percentage
    // Use totalInvestment (total capital allocated) for return calculation
    // This includes remaining USDC in the final value
    const totalReturn = ((finalValue - totalInvestment) / totalInvestment) * 100;

    // Average buy price
    // Use totalAmountSpentOnCoins (amount actually spent on buys) for average buy price
    // Only consider the quantity from buy transactions
    const totalQuantityFromBuys = buyTransactions.reduce(
      (sum, tx) => sum + Math.max(0, tx.quantityPurchased),
      0,
    );
    const avgBuyPrice =
      totalQuantityFromBuys > 0 ? totalAmountSpentOnCoins / totalQuantityFromBuys : 0;

    // Maximum drawdown
    const maxDrawdown = this.calculateMaxDrawdown(portfolioHistory);

    // Sharpe ratio
    const sharpeRatio = this.calculateSharpeRatio(portfolioHistory);

    return {
      totalReturn,
      avgBuyPrice,
      maxDrawdown,
      finalValue,
      sharpeRatio,
      totalInvestment,
      totalQuantity,
    };
  }

  /**
   * Calculate maximum drawdown
   */
  private static calculateMaxDrawdown(portfolioHistory: PortfolioValuePoint[]): number {
    let peak = portfolioHistory[0].value;
    let maxDrawdown = 0;

    for (const point of portfolioHistory) {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = ((peak - point.value) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate Sharpe ratio (simplified - assumes 0% risk-free rate)
   */
  private static calculateSharpeRatio(portfolioHistory: PortfolioValuePoint[]): number {
    if (portfolioHistory.length < 2) {
      return 0;
    }

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < portfolioHistory.length; i++) {
      const prevValue = portfolioHistory[i - 1].value;
      const currValue = portfolioHistory[i].value;
      const dailyReturn = (currValue - prevValue) / prevValue;
      returns.push(dailyReturn);
    }

    // Calculate average return
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Calculate standard deviation
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
      return 0;
    }

    // Annualize (assuming daily data, 252 trading days per year)
    const annualizedReturn = avgReturn * 252;
    const annualizedStdDev = stdDev * Math.sqrt(252);

    return annualizedReturn / annualizedStdDev;
  }

  /**
   * Build portfolio value history from transactions and candles
   * Includes remaining USDC in portfolio value calculation
   * Supports initial portfolio state (assets + USDC)
   */
  static buildPortfolioHistory(
    transactions: Transaction[],
    candles: Candlestick[],
    startDate: string,
    totalInvestment: number,
    initialAssetQuantity: number = 0,
    initialUsdc: number = 0,
  ): PortfolioValuePoint[] {
    const history: PortfolioValuePoint[] = [];
    let totalQuantity = initialAssetQuantity; // Start with initial assets
    let totalInvested = 0; // Sum of buy amounts (initial assets don't count as "invested")
    let totalSold = 0; // Sum of sell amounts
    let availableCash = initialUsdc; // Start with initial USDC

    // Create a map of transactions by date for quick lookup
    const transactionsByDate = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const date = tx.date.split('T')[0]; // Get date part only
      if (!transactionsByDate.has(date)) {
        transactionsByDate.set(date, []);
      }
      transactionsByDate.get(date)!.push(tx);
    }

    // Process each candle
    for (const candle of candles) {
      const candleDate = new Date(candle.timestamp).toISOString().split('T')[0];
      const candleDateFull = candle.timestamp;

      // Check if there are transactions on this date
      const dayTransactions = transactionsByDate.get(candleDate) || [];

      // Process transactions for this day
      for (const tx of dayTransactions) {
        const txType = tx.type || 'buy'; // Default to 'buy' for backward compatibility
        totalQuantity += tx.quantityPurchased; // Positive for buys, negative for sells

        if (txType === 'sell') {
          totalSold += tx.amount; // Sells add USDC back
          availableCash += tx.amount;
        } else {
          // For buys: if quantityPurchased is 0, it's funding (adds to cash)
          // Otherwise, it's a purchase (spends cash)
          if (tx.quantityPurchased === 0 && tx.amount > 0) {
            // Funding transaction: adds to cash, doesn't count as invested
            availableCash += tx.amount;
          } else if (tx.amount > 0) {
            // Purchase transaction: spends cash, counts as invested
            totalInvested += tx.amount;
            availableCash -= tx.amount;
          }
        }
      }

      // Calculate portfolio value at this point
      // Include both coin value and remaining USDC
      const coinValue = totalQuantity * candle.close;
      // Remaining USDC = initial USDC - amount spent on buys + amount received from sells
      const remainingUsdc = availableCash;
      const portfolioValue = coinValue + remainingUsdc;

      history.push({
        date: candleDateFull,
        value: portfolioValue,
        quantityHeld: totalQuantity,
        price: candle.close,
      });
    }

    return history;
  }
}

