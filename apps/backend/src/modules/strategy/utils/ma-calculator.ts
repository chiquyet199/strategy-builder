import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

/**
 * Moving Average Calculator
 * Calculates Simple Moving Average (SMA) for a given period
 */
export class MaCalculator {
  /**
   * Calculate Simple Moving Average for a series of candles
   * @param candles - Array of candlestick data
   * @param period - Moving average period (e.g., 200 for 200-day MA)
   * @returns Array of MA values (same length as candles, NaN for first period-1 values)
   */
  static calculate(candles: Candlestick[], period: number): number[] {
    if (candles.length < period) {
      throw new Error(
        `Need at least ${period} candles to calculate ${period}-period MA`,
      );
    }

    const maValues: number[] = new Array(candles.length).fill(NaN);

    // Calculate MA for each position
    for (let i = period - 1; i < candles.length; i++) {
      const sum = candles
        .slice(i - period + 1, i + 1)
        .reduce((acc, candle) => acc + candle.close, 0);
      maValues[i] = sum / period;
    }

    return maValues;
  }

  /**
   * Get MA value at a specific index
   */
  static getMaAt(
    candles: Candlestick[],
    index: number,
    period: number,
  ): number {
    if (index < period - 1) {
      return NaN;
    }

    const sum = candles
      .slice(index - period + 1, index + 1)
      .reduce((acc, candle) => acc + candle.close, 0);
    return sum / period;
  }
}
