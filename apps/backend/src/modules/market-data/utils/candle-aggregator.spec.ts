import { CandleAggregator } from './candle-aggregator';
import { Candlestick } from '../interfaces/candlestick.interface';

describe('CandleAggregator', () => {
  const createDailyCandle = (
    date: string,
    open: number,
    high: number,
    low: number,
    close: number,
  ): Candlestick => ({
    timestamp: date,
    open,
    high,
    low,
    close,
    volume: 1000000,
    timeframe: '1d',
  });

  describe('aggregateCandles', () => {
    it('should return daily candles as-is when target timeframe is 1d', () => {
      const dailyCandles: Candlestick[] = [
        createDailyCandle('2024-01-01T00:00:00.000Z', 100, 105, 99, 102),
        createDailyCandle('2024-01-02T00:00:00.000Z', 102, 108, 101, 106),
      ];

      const result = CandleAggregator.aggregateCandles(dailyCandles, '1d');

      expect(result).toEqual(dailyCandles);
    });

    it('should return empty array if input is empty', () => {
      const result = CandleAggregator.aggregateCandles([], '1w');

      expect(result).toEqual([]);
    });

    it('should aggregate daily candles to weekly candles', () => {
      const dailyCandles: Candlestick[] = [
        createDailyCandle('2024-01-01T00:00:00.000Z', 100, 105, 99, 102), // Monday
        createDailyCandle('2024-01-02T00:00:00.000Z', 102, 108, 101, 106), // Tuesday
        createDailyCandle('2024-01-03T00:00:00.000Z', 106, 110, 104, 108), // Wednesday
        createDailyCandle('2024-01-04T00:00:00.000Z', 108, 112, 107, 110), // Thursday
        createDailyCandle('2024-01-05T00:00:00.000Z', 110, 115, 109, 113), // Friday
        createDailyCandle('2024-01-08T00:00:00.000Z', 113, 118, 112, 116), // Next Monday
      ];

      const result = CandleAggregator.aggregateCandles(dailyCandles, '1w');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].timeframe).toBe('1w');
      expect(result[0].open).toBe(100); // First candle's open
      expect(result[0].close).toBe(113); // Last candle in week's close
      expect(result[0].high).toBe(115); // Max high in week
      expect(result[0].low).toBe(99); // Min low in week
    });

    it('should aggregate daily candles to monthly candles', () => {
      const dailyCandles: Candlestick[] = Array.from({ length: 30 }, (_, i) =>
        createDailyCandle(
          `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
          100 + i,
          105 + i,
          95 + i,
          102 + i,
        ),
      );

      const result = CandleAggregator.aggregateCandles(dailyCandles, '1m');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].timeframe).toBe('1m');
      expect(result[0].open).toBe(100); // First candle's open
      expect(result[0].close).toBe(131); // Last candle's close (100 + 30 - 1)
    });

    it('should aggregate to hourly candles correctly', () => {
      // Create hourly candles (simulating 1h timeframe input)
      const hourlyCandles: Candlestick[] = Array.from(
        { length: 24 },
        (_, i) => ({
          timestamp: `2024-01-01T${String(i).padStart(2, '0')}:00:00.000Z`,
          open: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 102 + i,
          volume: 100000,
          timeframe: '1h',
        }),
      );

      const result = CandleAggregator.aggregateCandles(hourlyCandles, '4h');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].timeframe).toBe('4h');
    });

    it('should calculate volume correctly in aggregated candle', () => {
      const dailyCandles: Candlestick[] = [
        createDailyCandle('2024-01-01T00:00:00.000Z', 100, 105, 99, 102),
        createDailyCandle('2024-01-02T00:00:00.000Z', 102, 108, 101, 106),
        createDailyCandle('2024-01-03T00:00:00.000Z', 106, 110, 104, 108),
      ];

      const result = CandleAggregator.aggregateCandles(dailyCandles, '1w');

      expect(result[0].volume).toBe(3000000); // Sum of all volumes
    });

    it('should handle single candle input', () => {
      const dailyCandles: Candlestick[] = [
        createDailyCandle('2024-01-01T00:00:00.000Z', 100, 105, 99, 102),
      ];

      const result = CandleAggregator.aggregateCandles(dailyCandles, '1w');

      expect(result.length).toBe(1);
      expect(result[0].open).toBe(100);
      expect(result[0].close).toBe(102);
      expect(result[0].high).toBe(105);
      expect(result[0].low).toBe(99);
    });

    it('should preserve timestamp of first candle in period', () => {
      const dailyCandles: Candlestick[] = [
        createDailyCandle('2024-01-01T00:00:00.000Z', 100, 105, 99, 102),
        createDailyCandle('2024-01-02T00:00:00.000Z', 102, 108, 101, 106),
        createDailyCandle('2024-01-03T00:00:00.000Z', 106, 110, 104, 108),
      ];

      const result = CandleAggregator.aggregateCandles(dailyCandles, '1w');

      expect(result[0].timestamp).toBe('2024-01-01T00:00:00.000Z');
    });
  });
});
