import { RsiCalculator } from './rsi-calculator';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

describe('RsiCalculator', () => {
  const createCandles = (prices: number[]): Candlestick[] => {
    return prices.map((price, index) => ({
      timestamp: `2024-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
      open: price,
      high: price * 1.01,
      low: price * 0.99,
      close: price,
      volume: 1000000,
      timeframe: '1d',
    }));
  };

  describe('calculate', () => {
    it('should throw error if not enough candles for period', () => {
      const candles = createCandles([100, 101, 102]);
      const period = 14;

      expect(() => RsiCalculator.calculate(candles, period)).toThrow(
        'Need at least 15 candles to calculate RSI with period 14',
      );
    });

    it('should calculate RSI correctly for upward trend', () => {
      // Create candles with consistent upward movement
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const candles = createCandles(prices);
      const period = 14;

      const rsiValues = RsiCalculator.calculate(candles, period);

      // First period-1 values should be NaN
      for (let i = 0; i < period; i++) {
        expect(rsiValues[i]).toBeNaN();
      }

      // RSI should be high (above 50) for upward trend
      expect(rsiValues[period]).toBeGreaterThan(50);
      expect(rsiValues[period]).toBeLessThanOrEqual(100);
    });

    it('should calculate RSI correctly for downward trend', () => {
      // Create candles with consistent downward movement
      const prices = Array.from({ length: 20 }, (_, i) => 100 - i);
      const candles = createCandles(prices);
      const period = 14;

      const rsiValues = RsiCalculator.calculate(candles, period);

      // RSI should be low (below 50) for downward trend
      expect(rsiValues[period]).toBeLessThan(50);
      expect(rsiValues[period]).toBeGreaterThanOrEqual(0);
    });

    it('should return RSI of 100 when avgLoss is 0', () => {
      // All prices increase (no losses)
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 2);
      const candles = createCandles(prices);
      const period = 14;

      const rsiValues = RsiCalculator.calculate(candles, period);

      expect(rsiValues[period]).toBe(100);
    });

    it('should handle custom period', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const candles = createCandles(prices);
      const period = 7;

      const rsiValues = RsiCalculator.calculate(candles, period);

      // First 7 values should be NaN
      for (let i = 0; i < period; i++) {
        expect(rsiValues[i]).toBeNaN();
      }

      // RSI should be calculated from index 7 onwards
      expect(rsiValues[period]).toBeGreaterThan(0);
      expect(rsiValues[period]).toBeLessThanOrEqual(100);
    });

    it('should return array of same length as input', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
      const candles = createCandles(prices);
      const period = 14;

      const rsiValues = RsiCalculator.calculate(candles, period);

      expect(rsiValues.length).toBe(candles.length);
    });

    it('should use Wilder smoothing for subsequent RSI values', () => {
      const prices = Array.from(
        { length: 20 },
        (_, i) => 100 + (i % 2 === 0 ? 1 : -1),
      );
      const candles = createCandles(prices);
      const period = 14;

      const rsiValues = RsiCalculator.calculate(candles, period);

      // All RSI values after period should be numbers
      for (let i = period; i < rsiValues.length; i++) {
        expect(rsiValues[i]).not.toBeNaN();
        expect(rsiValues[i]).toBeGreaterThanOrEqual(0);
        expect(rsiValues[i]).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('getRsiAt', () => {
    it('should return RSI value at specific index', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const candles = createCandles(prices);
      const period = 14;
      const index = 15;

      const rsiValue = RsiCalculator.getRsiAt(candles, index, period);
      const rsiValues = RsiCalculator.calculate(candles, period);

      expect(rsiValue).toBe(rsiValues[index]);
    });

    it('should return NaN for index before period', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const candles = createCandles(prices);
      const period = 14;
      const index = 10;

      const rsiValue = RsiCalculator.getRsiAt(candles, index, period);

      expect(rsiValue).toBeNaN();
    });
  });
});
