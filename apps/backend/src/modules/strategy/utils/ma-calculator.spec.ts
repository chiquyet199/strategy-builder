import { MaCalculator } from './ma-calculator';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

describe('MaCalculator', () => {
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
      const period = 5;

      expect(() => MaCalculator.calculate(candles, period)).toThrow(
        'Need at least 5 candles to calculate 5-period MA',
      );
    });

    it('should calculate simple moving average correctly', () => {
      const prices = [100, 101, 102, 103, 104, 105];
      const candles = createCandles(prices);
      const period = 5;

      const maValues = MaCalculator.calculate(candles, period);

      // First period-1 values should be NaN
      for (let i = 0; i < period - 1; i++) {
        expect(maValues[i]).toBeNaN();
      }

      // MA at index 4 (5th candle): (100+101+102+103+104) / 5 = 102
      expect(maValues[4]).toBe(102);

      // MA at index 5 (6th candle): (101+102+103+104+105) / 5 = 103
      expect(maValues[5]).toBe(103);
    });

    it('should return array of same length as input', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const candles = createCandles(prices);
      const period = 10;

      const maValues = MaCalculator.calculate(candles, period);

      expect(maValues.length).toBe(candles.length);
    });

    it('should handle different periods', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
      const candles = createCandles(prices);

      const ma5 = MaCalculator.calculate(candles, 5);
      const ma10 = MaCalculator.calculate(candles, 10);
      const ma20 = MaCalculator.calculate(candles, 20);

      expect(ma5[4]).not.toBeNaN();
      expect(ma10[9]).not.toBeNaN();
      expect(ma20[19]).not.toBeNaN();
    });

    it('should calculate MA correctly for constant prices', () => {
      const prices = Array(10).fill(100);
      const candles = createCandles(prices);
      const period = 5;

      const maValues = MaCalculator.calculate(candles, period);

      // All MA values should be 100
      for (let i = period - 1; i < maValues.length; i++) {
        expect(maValues[i]).toBe(100);
      }
    });

    it('should calculate MA correctly for increasing prices', () => {
      const prices = Array.from({ length: 10 }, (_, i) => 100 + i * 10);
      const candles = createCandles(prices);
      const period = 3;

      const maValues = MaCalculator.calculate(candles, period);

      // MA at index 2: (100 + 110 + 120) / 3 = 110
      expect(maValues[2]).toBe(110);

      // MA at index 3: (110 + 120 + 130) / 3 = 120
      expect(maValues[3]).toBe(120);
    });
  });

  describe('getMaAt', () => {
    it('should return MA value at specific index', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const candles = createCandles(prices);
      const period = 5;
      const index = 10;

      const maValue = MaCalculator.getMaAt(candles, index, period);
      const maValues = MaCalculator.calculate(candles, period);

      expect(maValue).toBe(maValues[index]);
    });

    it('should return NaN for index before period-1', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const candles = createCandles(prices);
      const period = 5;
      const index = 3;

      const maValue = MaCalculator.getMaAt(candles, index, period);

      expect(maValue).toBeNaN();
    });

    it('should calculate MA correctly at valid index', () => {
      const prices = [100, 101, 102, 103, 104, 105, 106];
      const candles = createCandles(prices);
      const period = 5;

      // MA at index 4: (100+101+102+103+104) / 5 = 102
      const maValue = MaCalculator.getMaAt(candles, 4, period);
      expect(maValue).toBe(102);

      // MA at index 6: (102+103+104+105+106) / 5 = 104
      const maValue2 = MaCalculator.getMaAt(candles, 6, period);
      expect(maValue2).toBe(104);
    });
  });
});

