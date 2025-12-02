import { Candlestick, Timeframe } from '../interfaces/candlestick.interface';

/**
 * Utility for aggregating daily candles to higher timeframes
 */
export class CandleAggregator {
  /**
   * Get milliseconds for a timeframe
   */
  private static getTimeframeMs(timeframe: Timeframe): number {
    const timeframeMap: Record<Timeframe, number> = {
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1m': 30 * 24 * 60 * 60 * 1000, // Approximate month
    };
    return timeframeMap[timeframe];
  }

  /**
   * Aggregate daily candles to higher timeframes
   */
  static aggregateCandles(
    dailyCandles: Candlestick[],
    targetTimeframe: Timeframe,
  ): Candlestick[] {
    if (targetTimeframe === '1d' || dailyCandles.length === 0) {
      return dailyCandles;
    }

    const aggregated: Candlestick[] = [];
    const timeframeMs = this.getTimeframeMs(targetTimeframe);

    let currentPeriodStart = new Date(dailyCandles[0].timestamp);
    let periodCandles: Candlestick[] = [];

    for (const candle of dailyCandles) {
      const candleDate = new Date(candle.timestamp);

      if (candleDate.getTime() - currentPeriodStart.getTime() >= timeframeMs) {
        // Aggregate current period
        if (periodCandles.length > 0) {
          aggregated.push(this.aggregatePeriod(periodCandles, targetTimeframe));
        }
        // Start new period
        periodCandles = [candle];
        currentPeriodStart = new Date(candleDate);
      } else {
        periodCandles.push(candle);
      }
    }

    // Aggregate remaining candles
    if (periodCandles.length > 0) {
      aggregated.push(this.aggregatePeriod(periodCandles, targetTimeframe));
    }

    return aggregated;
  }

  /**
   * Aggregate a period of candles into a single candle
   */
  private static aggregatePeriod(
    candles: Candlestick[],
    timeframe: Timeframe,
  ): Candlestick {
    const open = candles[0].open;
    const close = candles[candles.length - 1].close;
    const high = Math.max(...candles.map((c) => c.high));
    const low = Math.min(...candles.map((c) => c.low));
    const volume = candles.reduce((sum, c) => sum + c.volume, 0);

    return {
      timestamp: candles[0].timestamp,
      open,
      high,
      low,
      close,
      volume,
      timeframe,
    };
  }
}
