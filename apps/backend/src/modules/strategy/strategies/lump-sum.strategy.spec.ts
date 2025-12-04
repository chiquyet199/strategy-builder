import { LumpSumStrategy } from './lump-sum.strategy';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

describe('LumpSumStrategy', () => {
  let strategy: LumpSumStrategy;

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
      timestamp: '2024-01-02T00:00:00.000Z',
      open: 40000,
      high: 42000,
      low: 40000,
      close: 41000,
      volume: 1200000,
      timeframe: '1d',
    },
    {
      timestamp: '2024-01-03T00:00:00.000Z',
      open: 41000,
      high: 43000,
      low: 41000,
      close: 42000,
      volume: 1300000,
      timeframe: '1d',
    },
  ];

  beforeEach(() => {
    strategy = new LumpSumStrategy();
  });


  describe('validateParameters', () => {
    it('should not throw for empty parameters', () => {
      expect(() => strategy.validateParameters({})).not.toThrow();
    });

    it('should not throw for undefined parameters', () => {
      expect(() => strategy.validateParameters(undefined)).not.toThrow();
    });
  });

  describe('calculate', () => {
    it('should throw error for empty candles', () => {
      expect(() =>
        strategy.calculate([], 10000, '2024-01-01', '2024-01-31', {}),
      ).toThrow('No candles provided for calculation');
    });

    it('should buy all at first candle with USDC only', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(result.strategyId).toBe('lump-sum');
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].type).toBe('buy');
      expect(result.transactions[0].amount).toBe(10000);
      expect(result.transactions[0].price).toBe(40000);
      expect(result.transactions[0].quantityPurchased).toBe(0.25); // 10000 / 40000
      expect(result.transactions[0].reason).toBe('Initial lump sum purchase');
    });

    it('should handle initial portfolio with BTC assets', () => {
      const initialPortfolio = {
        assets: [{ symbol: 'BTC', quantity: 0.5 }],
        usdcAmount: 5000,
      };

      const result = strategy.calculate(
        mockCandles,
        0, // investmentAmount ignored when initialPortfolio is provided
        '2024-01-01',
        '2024-01-31',
        { _initialPortfolio: initialPortfolio },
      );

      // Should have no transactions since we already have BTC
      expect(result.transactions).toHaveLength(0);
      expect(result.metrics.totalQuantity).toBe(0.5);
    });

    it('should handle initial portfolio with USDC only', () => {
      const initialPortfolio = {
        assets: [],
        usdcAmount: 10000,
      };

      const result = strategy.calculate(
        mockCandles,
        0,
        '2024-01-01',
        '2024-01-31',
        { _initialPortfolio: initialPortfolio },
      );

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].amount).toBe(10000);
    });

    it('should handle periodic funding', () => {
      // Create more candles to cover the date range for weekly funding
      const moreCandles: Candlestick[] = Array.from({ length: 35 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1).toISOString(),
        open: 40000,
        high: 41000,
        low: 39000,
        close: 40000,
        volume: 1000000,
        timeframe: '1d',
      }));

      const fundingSchedule = {
        frequency: 'weekly' as const,
        amount: 1000,
      };

      const result = strategy.calculate(
        moreCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        { _fundingSchedule: fundingSchedule },
      );

      // Should have transactions (initial buy + funding)
      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.metrics).toBeDefined();
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
      expect(result.metrics.totalInvestment).toBe(10000);
      expect(result.metrics.totalQuantity).toBe(0.25);
      expect(result.metrics.avgBuyPrice).toBe(40000);
      expect(result.metrics.finalValue).toBeGreaterThan(0);
      expect(result.metrics.totalReturn).toBeDefined();
      expect(result.metrics.maxDrawdown).toBeDefined();
      expect(result.metrics.sharpeRatio).toBeDefined();
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
      result.portfolioValueHistory.forEach((point) => {
        expect(point.date).toBeDefined();
        expect(point.value).toBeGreaterThan(0);
        expect(point.quantityHeld).toBeGreaterThanOrEqual(0);
        expect(point.price).toBeGreaterThan(0);
      });
    });

    it('should respect allowNegativeUsdc parameter', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        { allowNegativeUsdc: true },
      );

      // Should still work, but with different behavior if needed
      expect(result).toBeDefined();
    });
  });
});
