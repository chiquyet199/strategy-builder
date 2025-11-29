import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

/**
 * RSI (Relative Strength Index) Calculator
 * Calculates RSI for a given period
 */
export class RsiCalculator {
  /**
   * Calculate RSI for a series of candles
   * @param candles - Array of candlestick data
   * @param period - RSI period (default: 14)
   * @returns Array of RSI values (same length as candles, NaN for first period-1 values)
   */
  static calculate(candles: Candlestick[], period: number = 14): number[] {
    if (candles.length < period + 1) {
      throw new Error(`Need at least ${period + 1} candles to calculate RSI with period ${period}`);
    }

    const rsiValues: number[] = new Array(candles.length).fill(NaN);
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((sum, g) => sum + g, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, l) => sum + l, 0) / period;

    // Calculate first RSI value
    if (avgLoss === 0) {
      rsiValues[period] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsiValues[period] = 100 - 100 / (1 + rs);
    }

    // Calculate subsequent RSI values using Wilder's smoothing
    for (let i = period + 1; i < candles.length; i++) {
      const idx = i - 1;
      avgGain = (avgGain * (period - 1) + gains[idx]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[idx]) / period;

      if (avgLoss === 0) {
        rsiValues[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsiValues[i] = 100 - 100 / (1 + rs);
      }
    }

    return rsiValues;
  }

  /**
   * Get RSI value at a specific index
   */
  static getRsiAt(candles: Candlestick[], index: number, period: number = 14): number {
    const rsiValues = this.calculate(candles, period);
    return rsiValues[index];
  }
}

