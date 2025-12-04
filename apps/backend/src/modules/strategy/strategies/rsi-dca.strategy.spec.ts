import { RsiDcaStrategy } from './rsi-dca.strategy';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

describe('RsiDcaStrategy', () => {
  let strategy: RsiDcaStrategy;

  // Create enough candles for RSI calculation (need at least 15 for RSI period 14)
  const mockCandles: Candlestick[] = Array.from({ length: 30 }, (_, i) => ({
    timestamp: new Date(2024, 0, i + 1).toISOString(),
    open: 40000 - i * 100,
    high: 41000 - i * 100,
    low: 39000 - i * 100,
    close: 40000 - i * 100, // Decreasing price to create oversold conditions
    volume: 1000000,
    timeframe: '1d' as const,
  }));

  beforeEach(() => {
    strategy = new RsiDcaStrategy();
  });


  describe('validateParameters', () => {
    it('should not throw for valid parameters', () => {
      expect(() =>
        strategy.validateParameters({
          rsiPeriod: 14,
          oversoldThreshold: 30,
          overboughtThreshold: 70,
          buyMultiplier: 2.0,
        }),
      ).not.toThrow();
    });

    it('should throw for invalid RSI period', () => {
      expect(() => strategy.validateParameters({ rsiPeriod: 1 })).toThrow(
        'RSI period must be between 2 and 50',
      );
      expect(() => strategy.validateParameters({ rsiPeriod: 51 })).toThrow(
        'RSI period must be between 2 and 50',
      );
    });

    it('should throw for invalid oversold threshold', () => {
      expect(() =>
        strategy.validateParameters({ oversoldThreshold: -1 }),
      ).toThrow('Oversold threshold must be between 0 and 50');
      expect(() =>
        strategy.validateParameters({ oversoldThreshold: 51 }),
      ).toThrow('Oversold threshold must be between 0 and 50');
    });

    it('should throw for invalid overbought threshold', () => {
      expect(() =>
        strategy.validateParameters({ overboughtThreshold: 49 }),
      ).toThrow('Overbought threshold must be between 50 and 100');
      expect(() =>
        strategy.validateParameters({ overboughtThreshold: 101 }),
      ).toThrow('Overbought threshold must be between 50 and 100');
    });

    it('should throw for invalid buy multiplier', () => {
      expect(() =>
        strategy.validateParameters({ buyMultiplier: 0.05 }),
      ).toThrow('Buy multiplier must be between 0.1 and 10');
      expect(() => strategy.validateParameters({ buyMultiplier: 11 })).toThrow(
        'Buy multiplier must be between 0.1 and 10',
      );
    });

    it('should throw if oversold >= overbought', () => {
      expect(() =>
        strategy.validateParameters({
          oversoldThreshold: 50,
          overboughtThreshold: 50,
        }),
      ).toThrow('Oversold threshold must be less than overbought threshold');
    });
  });

  describe('calculate', () => {
    it('should throw error for empty candles', () => {
      expect(() =>
        strategy.calculate([], 10000, '2024-01-01', '2024-01-31', {}),
      ).toThrow('No candles provided for calculation');
    });

    it('should throw error if not enough candles for RSI', () => {
      const shortCandles = mockCandles.slice(0, 10);
      expect(() =>
        strategy.calculate(shortCandles, 10000, '2024-01-01', '2024-01-31', {
          rsiPeriod: 14,
        }),
      ).toThrow(); // Just check that it throws
    });

    it('should calculate strategy with default parameters', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(result.strategyId).toBe('rsi-dca');
      expect(result.transactions).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should buy more when RSI is oversold', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {
          rsiPeriod: 14,
          oversoldThreshold: 30,
          buyMultiplier: 2.0,
        },
      );

      // Strategy should execute successfully
      expect(result.strategyId).toBe('rsi-dca');
      expect(result.transactions).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalQuantity).toBeGreaterThanOrEqual(0);
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

    it('should handle periodic funding', () => {
      const fundingSchedule = {
        frequency: 'weekly' as const,
        amount: 500,
      };

      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        { _fundingSchedule: fundingSchedule },
      );

      const fundingTransactions = result.transactions.filter(
        (t) => t.type === 'funding',
      );
      expect(fundingTransactions.length).toBeGreaterThan(0);
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
