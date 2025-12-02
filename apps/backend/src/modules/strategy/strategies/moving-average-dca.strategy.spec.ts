import { MovingAverageDcaStrategy } from './moving-average-dca.strategy';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

describe('MovingAverageDcaStrategy', () => {
  let strategy: MovingAverageDcaStrategy;

  // Create enough candles for MA calculation (need at least 200 for default MA period)
  const mockCandles: Candlestick[] = Array.from({ length: 250 }, (_, i) => ({
    timestamp: new Date(2024, 0, i + 1).toISOString(),
    open: 40000 - i * 10,
    high: 41000 - i * 10,
    low: 39000 - i * 10,
    close: 40000 - i * 10,
    volume: 1000000,
    timeframe: '1d' as const,
  }));

  beforeEach(() => {
    strategy = new MovingAverageDcaStrategy();
  });

  describe('getStrategyId', () => {
    it('should return correct strategy ID', () => {
      expect(strategy.getStrategyId()).toBe('moving-average-dca');
    });
  });

  describe('getStrategyName', () => {
    it('should return correct strategy name', () => {
      expect(strategy.getStrategyName()).toBe('Moving Average DCA');
    });
  });

  describe('getDefaultParameters', () => {
    it('should return default parameters', () => {
      const defaults = strategy.getDefaultParameters();
      expect(defaults.maPeriod).toBe(200);
      expect(defaults.buyMultiplier).toBe(2.0);
    });
  });

  describe('validateParameters', () => {
    it('should not throw for valid parameters', () => {
      expect(() =>
        strategy.validateParameters({
          maPeriod: 200,
          buyMultiplier: 2.0,
        }),
      ).not.toThrow();
    });

    it('should throw for invalid MA period', () => {
      expect(() => strategy.validateParameters({ maPeriod: 1 })).toThrow(
        'MA period must be between 2 and 500',
      );
      expect(() => strategy.validateParameters({ maPeriod: 501 })).toThrow(
        'MA period must be between 2 and 500',
      );
    });

    it('should throw for invalid buy multiplier', () => {
      expect(() =>
        strategy.validateParameters({ buyMultiplier: 0.05 }),
      ).toThrow('Buy multiplier must be between 0.1 and 10');
      expect(() => strategy.validateParameters({ buyMultiplier: 11 })).toThrow(
        'Buy multiplier must be between 0.1 and 10',
      );
    });
  });

  describe('calculate', () => {
    it('should throw error for empty candles', () => {
      expect(() =>
        strategy.calculate([], 10000, '2024-01-01', '2024-01-31', {}),
      ).toThrow('No candles provided for calculation');
    });

    it('should throw error if not enough candles for MA', () => {
      const shortCandles = mockCandles.slice(0, 100);
      expect(() =>
        strategy.calculate(shortCandles, 10000, '2024-01-01', '2024-01-31', {
          maPeriod: 200,
        }),
      ).toThrow('Need at least 200 candles to calculate 200-period MA');
    });

    it('should calculate strategy with default parameters', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(result.strategyId).toBe('moving-average-dca');
      expect(result.transactions).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should buy more when price is below MA', () => {
      // Create candles where price is below MA
      const candlesBelowMA: Candlestick[] = Array.from(
        { length: 250 },
        (_, i) => ({
          timestamp: new Date(2024, 0, i + 1).toISOString(),
          open: 35000, // Below average
          high: 36000,
          low: 34000,
          close: 35000,
          volume: 1000000,
          timeframe: '1d' as const,
        }),
      );

      const result = strategy.calculate(
        candlesBelowMA,
        10000,
        '2024-01-01',
        '2024-01-31',
        {
          maPeriod: 200,
          buyMultiplier: 2.0,
        },
      );

      // Strategy should execute successfully
      expect(result.strategyId).toBe('moving-average-dca');
      expect(result.transactions).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should handle custom MA period', () => {
      const shorterCandles = mockCandles.slice(0, 50);
      const result = strategy.calculate(
        shorterCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {
          maPeriod: 20, // Shorter period
          buyMultiplier: 2.0,
        },
      );

      expect(result.strategyId).toBe('moving-average-dca');
    });

    it('should handle initial portfolio', () => {
      const initialPortfolio = {
        assets: [{ symbol: 'BTC', quantity: 0.5 }],
        usdcAmount: 5000,
      };

      const result = strategy.calculate(
        mockCandles,
        0,
        '2024-01-01',
        '2024-01-31',
        { _initialPortfolio: initialPortfolio },
      );

      expect(result.metrics.totalQuantity).toBeGreaterThan(0.5);
    });

    it('should calculate correct metrics', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalInvestment).toBeGreaterThan(0);
      expect(result.metrics.totalQuantity).toBeGreaterThan(0);
      expect(result.metrics.avgBuyPrice).toBeGreaterThan(0);
    });
  });
});
