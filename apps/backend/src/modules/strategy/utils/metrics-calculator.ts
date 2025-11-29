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
    const totalBTC = portfolioHistory[portfolioHistory.length - 1].btcHeld;

    // Total return percentage
    const totalReturn = ((finalValue - totalInvestment) / totalInvestment) * 100;

    // Average buy price
    const avgBuyPrice = totalInvestment / totalBTC;

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
      totalBTC,
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
   */
  static buildPortfolioHistory(
    transactions: Transaction[],
    candles: Candlestick[],
    startDate: string,
  ): PortfolioValuePoint[] {
    const history: PortfolioValuePoint[] = [];
    let totalBTC = 0;
    let totalInvested = 0;

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
        totalBTC += tx.btcPurchased;
        totalInvested += tx.amount;
      }

      // Calculate portfolio value at this point
      const portfolioValue = totalBTC * candle.close;

      history.push({
        date: candleDateFull,
        value: portfolioValue,
        btcHeld: totalBTC,
        price: candle.close,
      });
    }

    return history;
  }
}

