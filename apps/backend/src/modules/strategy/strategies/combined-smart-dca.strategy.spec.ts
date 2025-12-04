import { CombinedSmartDcaStrategy } from './combined-smart-dca.strategy';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

describe('CombinedSmartDcaStrategy', () => {
  let strategy: CombinedSmartDcaStrategy;

  // Create enough candles for all indicators (need at least 200 for MA, 14 for RSI, 30 for lookback)
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
    strategy = new CombinedSmartDcaStrategy();
  });


  describe('validateParameters', () => {
    it('should not throw for valid parameters', () => {
      expect(() =>
        strategy.validateParameters({
          rsiPeriod: 14,
          oversoldThreshold: 30,
          maPeriod: 200,
          lookbackDays: 30,
          dropThreshold: 0.1,
          maxMultiplier: 2.5,
        }),
      ).not.toThrow();
    });

    it('should throw for invalid RSI period', () => {
      expect(() => strategy.validateParameters({ rsiPeriod: 1 })).toThrow(
        'RSI period must be between 2 and 50',
      );
    });

    it('should throw for invalid oversold threshold', () => {
      expect(() =>
        strategy.validateParameters({ oversoldThreshold: 51 }),
      ).toThrow('Oversold threshold must be between 0 and 50');
    });

    it('should throw for invalid MA period', () => {
      expect(() => strategy.validateParameters({ maPeriod: 1 })).toThrow(
        'MA period must be between 2 and 500',
      );
    });

    it('should throw for invalid lookback days', () => {
      expect(() => strategy.validateParameters({ lookbackDays: 0 })).toThrow(
        'Lookback days must be between 1 and 365',
      );
    });

    it('should throw for invalid drop threshold', () => {
      expect(() => strategy.validateParameters({ dropThreshold: 1.1 })).toThrow(
        'Drop threshold must be between 0 and 1',
      );
    });

    it('should throw for invalid max multiplier', () => {
      expect(() => strategy.validateParameters({ maxMultiplier: 11 })).toThrow(
        'Max multiplier must be between 0.1 and 10',
      );
    });
  });

  describe('calculate', () => {
    it('should throw error for empty candles', () => {
      expect(() =>
        strategy.calculate([], 10000, '2024-01-01', '2024-01-31', {}),
      ).toThrow('No candles provided for calculation');
    });

    it('should throw error if not enough candles', () => {
      const shortCandles = mockCandles.slice(0, 100);
      expect(() =>
        strategy.calculate(shortCandles, 10000, '2024-01-01', '2024-01-31', {}),
      ).toThrow('Need at least');
    });

    it('should calculate strategy with default parameters', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(result.strategyId).toBe('combined-smart-dca');
      expect(result.transactions).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should handle custom parameters', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {
          rsiPeriod: 14,
          oversoldThreshold: 30,
          maPeriod: 200,
          lookbackDays: 30,
          dropThreshold: 0.1,
          maxMultiplier: 2.5,
        },
      );

      expect(result.strategyId).toBe('combined-smart-dca');
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

    it('should combine multiple signals', () => {
      // Create candles that trigger multiple signals
      const signalCandles: Candlestick[] = Array.from(
        { length: 250 },
        (_, i) => ({
          timestamp: new Date(2024, 0, i + 1).toISOString(),
          open: 40000,
          high: 42000,
          low: 35000, // Large drop
          close: i < 100 ? 42000 : 36000, // Price drop
          volume: 1000000,
          timeframe: '1d' as const,
        }),
      );

      const result = strategy.calculate(
        signalCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      // Strategy should execute successfully
      expect(result.strategyId).toBe('combined-smart-dca');
      expect(result.transactions).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalQuantity).toBeGreaterThanOrEqual(0);
    });
  });
});
