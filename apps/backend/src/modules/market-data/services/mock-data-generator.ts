import { Candlestick, Timeframe } from '../interfaces/candlestick.interface';

/**
 * Mock Data Generator
 * Generates realistic cryptocurrency price data for backtesting
 * Uses historical price ranges and realistic volatility patterns
 * Currently generates BTC-like price data, but can be extended for other assets
 */
export class MockDataGenerator {
  /**
   * Generate candlestick data for a given date range and timeframe
   */
  static generateCandles(
    startDate: Date,
    endDate: Date,
    timeframe: Timeframe = '1d',
  ): Candlestick[] {
    const candles: Candlestick[] = [];
    const currentDate = new Date(startDate);

    // Historical cryptocurrency price ranges (approximate, BTC-like)
    // 2020: ~$7,000 - $29,000
    // 2021: ~$29,000 - $69,000 (peak)
    // 2022: ~$69,000 - $15,000 (crash)
    // 2023: ~$15,000 - $44,000 (recovery)
    // 2024: ~$44,000 - $73,000 (new ATH)
    // 2025: ~$50,000 - $100,000+ (projected range)

    let basePrice = this.getBasePriceForDate(currentDate);
    const timeframeMs = this.getTimeframeMs(timeframe);

    while (currentDate <= endDate) {
      // Add some realistic volatility
      const volatility = 0.02; // 2% daily volatility
      const trend = this.getTrendForDate(currentDate);
      
      // Random walk with trend
      const change = (Math.random() - 0.5) * volatility * 2 + trend;
      basePrice = basePrice * (1 + change);

      // Ensure price stays within realistic bounds
      basePrice = Math.max(5000, Math.min(150000, basePrice));

      // Generate OHLC from base price
      const open = basePrice;
      const high = open * (1 + Math.random() * 0.05); // Up to 5% higher
      const low = open * (1 - Math.random() * 0.05); // Up to 5% lower
      const close = low + (high - low) * Math.random();
      
      // Update base price to close for next iteration
      basePrice = close;

      candles.push({
        timestamp: currentDate.toISOString(),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.random() * 1000000 + 100000, // Random volume
        timeframe,
      });

      // Move to next period
      currentDate.setTime(currentDate.getTime() + timeframeMs);
    }

    return candles;
  }

  /**
   * Get base price for a given date (approximate historical values)
   */
  private static getBasePriceForDate(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();

    // Approximate historical prices
    if (year === 2020) {
      return 7000 + (month / 12) * 22000; // $7k to $29k
    } else if (year === 2021) {
      if (month < 4) return 29000 + (month / 4) * 40000; // $29k to $69k
      else if (month < 8) return 69000 - ((month - 4) / 4) * 20000; // $69k to $49k
      else return 49000 + ((month - 8) / 4) * 20000; // $49k to $69k
    } else if (year === 2022) {
      return 69000 - (month / 12) * 54000; // $69k to $15k (crash)
    } else if (year === 2023) {
      return 15000 + (month / 12) * 29000; // $15k to $44k (recovery)
    } else if (year === 2024) {
      return 44000 + (month / 12) * 29000; // $44k to $73k
    } else if (year === 2025) {
      return 50000 + (month / 12) * 50000; // $50k to $100k (projected)
    }

    // Default fallback
    return 30000;
  }

  /**
   * Get trend direction for a given date
   */
  private static getTrendForDate(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();

    // Bull markets
    if (year === 2020 && month >= 9) return 0.001; // Late 2020 bull run
    if (year === 2021 && month < 4) return 0.002; // Early 2021 bull run
    if (year === 2023 && month >= 6) return 0.0015; // 2023 recovery
    if (year === 2024) return 0.001; // 2024 bull market

    // Bear markets
    if (year === 2022) return -0.002; // 2022 crash
    if (year === 2023 && month < 6) return -0.0005; // Early 2023 consolidation

    // Neutral/sideways
    return 0;
  }

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
    if (targetTimeframe === '1d') {
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

