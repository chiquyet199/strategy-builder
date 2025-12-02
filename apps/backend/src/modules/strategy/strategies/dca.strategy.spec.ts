import { DcaStrategy } from './dca.strategy';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

describe('DcaStrategy', () => {
  let strategy: DcaStrategy;

  const mockCandles: Candlestick[] = [
    {
      timestamp: '2024-01-01T00:00:00.000Z',
      open: 40000,
      high: 41000,
      low: 39000,
      close: 40000,
      volume: 1000000,
      timeframe: '1d',
    },
    {
      timestamp: '2024-01-08T00:00:00.000Z', // 7 days later (weekly)
      open: 40000,
      high: 42000,
      low: 40000,
      close: 41000,
      volume: 1200000,
      timeframe: '1d',
    },
    {
      timestamp: '2024-01-15T00:00:00.000Z', // 14 days later
      open: 41000,
      high: 43000,
      low: 41000,
      close: 42000,
      volume: 1300000,
      timeframe: '1d',
    },
  ];

  beforeEach(() => {
    strategy = new DcaStrategy();
  });

  describe('getStrategyId', () => {
    it('should return correct strategy ID', () => {
      expect(strategy.getStrategyId()).toBe('dca');
    });
  });

  describe('getStrategyName', () => {
    it('should return correct strategy name', () => {
      expect(strategy.getStrategyName()).toBe('DCA (Dollar-Cost Averaging)');
    });
  });

  describe('getDefaultParameters', () => {
    it('should return default frequency', () => {
      expect(strategy.getDefaultParameters()).toEqual({ frequency: 'weekly' });
    });
  });

  describe('validateParameters', () => {
    it('should not throw for valid frequency', () => {
      expect(() =>
        strategy.validateParameters({ frequency: 'daily' }),
      ).not.toThrow();
      expect(() =>
        strategy.validateParameters({ frequency: 'weekly' }),
      ).not.toThrow();
      expect(() =>
        strategy.validateParameters({ frequency: 'monthly' }),
      ).not.toThrow();
    });

    it('should throw for invalid frequency', () => {
      expect(() =>
        strategy.validateParameters({ frequency: 'invalid' }),
      ).toThrow('Frequency must be one of: daily, weekly, monthly');
    });
  });

  describe('calculate', () => {
    it('should throw error for empty candles', () => {
      expect(() =>
        strategy.calculate([], 10000, '2024-01-01', '2024-01-31', {}),
      ).toThrow('No candles provided for calculation');
    });

    it('should make weekly purchases with default frequency', () => {
      // Create more candles to cover the date range
      const moreCandles: Candlestick[] = Array.from({ length: 35 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1).toISOString(),
        open: 40000,
        high: 41000,
        low: 39000,
        close: 40000,
        volume: 1000000,
        timeframe: '1d',
      }));

      const result = strategy.calculate(
        moreCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(result.strategyId).toBe('dca');
      expect(result.transactions.length).toBeGreaterThan(0);
      // Should have transactions (may include funding or buys)
      expect(result.metrics).toBeDefined();
    });

    it('should make daily purchases with daily frequency', () => {
      // Create more candles to cover the date range
      const moreCandles: Candlestick[] = Array.from({ length: 35 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1).toISOString(),
        open: 40000,
        high: 41000,
        low: 39000,
        close: 40000,
        volume: 1000000,
        timeframe: '1d',
      }));

      const result = strategy.calculate(
        moreCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        { frequency: 'daily' },
      );

      expect(result.strategyId).toBe('dca');
      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.metrics).toBeDefined();
    });

    it('should make monthly purchases with monthly frequency', () => {
      // Create more candles to cover the date range
      const moreCandles: Candlestick[] = Array.from({ length: 35 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1).toISOString(),
        open: 40000,
        high: 41000,
        low: 39000,
        close: 40000,
        volume: 1000000,
        timeframe: '1d',
      }));

      const result = strategy.calculate(
        moreCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        { frequency: 'monthly' },
      );

      expect(result.strategyId).toBe('dca');
      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.metrics).toBeDefined();
    });

    it('should handle initial portfolio with BTC assets', () => {
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
      expect(result.metrics.finalValue).toBeGreaterThan(0);
    });

    it('should not allow negative USDC by default', () => {
      // With limited cash, should cap purchases
      const result = strategy.calculate(
        mockCandles,
        1000, // Small amount
        '2024-01-01',
        '2024-01-31',
        { frequency: 'daily' },
      );

      // Should still work, capping to available cash
      expect(result).toBeDefined();
      result.transactions.forEach((t) => {
        if (t.type === 'buy') {
          expect(t.amount).toBeGreaterThan(0);
        }
      });
    });

    it('should generate portfolio value history', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(result.portfolioValueHistory).toBeDefined();
      expect(result.portfolioValueHistory.length).toBeGreaterThan(0);
    });
  });
});
