import { RebalancingStrategy } from './rebalancing.strategy';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';

describe('RebalancingStrategy', () => {
  let strategy: RebalancingStrategy;

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
      high: 50000, // Price increase to trigger rebalancing
      low: 40000,
      close: 50000,
      volume: 1200000,
      timeframe: '1d',
    },
    {
      timestamp: '2024-01-03T00:00:00.000Z',
      open: 50000,
      high: 51000,
      low: 50000,
      close: 50000,
      volume: 1300000,
      timeframe: '1d',
    },
  ];

  beforeEach(() => {
    strategy = new RebalancingStrategy();
  });

  describe('getStrategyId', () => {
    it('should return correct strategy ID', () => {
      expect(strategy.getStrategyId()).toBe('rebalancing');
    });
  });

  describe('getStrategyName', () => {
    it('should return correct strategy name', () => {
      expect(strategy.getStrategyName()).toBe('Portfolio Rebalancing');
    });
  });

  describe('getDefaultParameters', () => {
    it('should return default parameters', () => {
      const defaults = strategy.getDefaultParameters();
      expect(defaults.targetAllocation).toBe(0.8);
      expect(defaults.rebalanceThreshold).toBe(0.1);
      expect(defaults.rebalanceSchedule).toBe('none');
    });
  });

  describe('validateParameters', () => {
    it('should not throw for valid parameters', () => {
      expect(() =>
        strategy.validateParameters({
          targetAllocation: 0.8,
          rebalanceThreshold: 0.1,
          rebalanceSchedule: 'weekly',
        }),
      ).not.toThrow();
    });

    it('should throw for invalid target allocation', () => {
      expect(() =>
        strategy.validateParameters({ targetAllocation: -0.1 }),
      ).toThrow('Target allocation must be between 0 and 1 (0% to 100%)');
      expect(() =>
        strategy.validateParameters({ targetAllocation: 1.1 }),
      ).toThrow('Target allocation must be between 0 and 1 (0% to 100%)');
    });

    it('should throw for invalid rebalance threshold', () => {
      expect(() =>
        strategy.validateParameters({ rebalanceThreshold: -0.1 }),
      ).toThrow('Rebalance threshold must be between 0 and 1 (0% to 100%)');
      expect(() =>
        strategy.validateParameters({ rebalanceThreshold: 1.1 }),
      ).toThrow('Rebalance threshold must be between 0 and 1 (0% to 100%)');
    });

    it('should throw if threshold exceeds allocation bounds', () => {
      expect(() =>
        strategy.validateParameters({
          targetAllocation: 0.5,
          rebalanceThreshold: 0.6, // Would cause negative allocation
        }),
      ).toThrow(
        'Rebalance threshold would cause allocation to go below 0% or above 100%',
      );
    });

    it('should throw for invalid rebalance schedule', () => {
      expect(() =>
        strategy.validateParameters({ rebalanceSchedule: 'invalid' }),
      ).toThrow(
        'Rebalance schedule must be "none", "weekly", "monthly", "quarterly", "half-yearly", or "yearly"',
      );
    });

    it('should accept all valid schedule options', () => {
      const validSchedules = [
        'none',
        'weekly',
        'monthly',
        'quarterly',
        'half-yearly',
        'yearly',
      ];
      validSchedules.forEach((schedule) => {
        expect(() =>
          strategy.validateParameters({ rebalanceSchedule: schedule }),
        ).not.toThrow();
      });
    });
  });

  describe('calculate', () => {
    it('should throw error for empty candles', () => {
      expect(() =>
        strategy.calculate([], 10000, '2024-01-01', '2024-01-31', {}),
      ).toThrow('No candles provided for calculation');
    });

    it('should calculate strategy with default parameters', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(result.strategyId).toBe('rebalancing');
      expect(result.transactions).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should rebalance when threshold is exceeded', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {
          targetAllocation: 0.8,
          rebalanceThreshold: 0.1,
        },
      );

      // Should have buy/sell transactions for rebalancing
      const rebalanceTransactions = result.transactions.filter(
        (t) => t.type === 'buy' || t.type === 'sell',
      );
      expect(rebalanceTransactions.length).toBeGreaterThan(0);
    });

    it('should rebalance on schedule', () => {
      const moreCandles: Candlestick[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1).toISOString(),
        open: 40000,
        high: 41000,
        low: 39000,
        close: 40000,
        volume: 1000000,
        timeframe: '1d' as const,
      }));

      const result = strategy.calculate(
        moreCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {
          targetAllocation: 0.8,
          rebalanceSchedule: 'weekly',
        },
      );

      // Should have rebalancing transactions
      expect(result.transactions.length).toBeGreaterThan(0);
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

      expect(result.metrics.totalQuantity).toBeGreaterThanOrEqual(0.5);
    });

    it('should handle periodic funding', () => {
      const fundingSchedule = {
        frequency: 'weekly' as const,
        amount: 500,
      };

      const moreCandles: Candlestick[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1).toISOString(),
        open: 40000,
        high: 41000,
        low: 39000,
        close: 40000,
        volume: 1000000,
        timeframe: '1d' as const,
      }));

      const result = strategy.calculate(
        moreCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {
          _fundingSchedule: fundingSchedule,
          targetAllocation: 0.8,
        },
      );

      const fundingTransactions = result.transactions.filter(
        (t) => t.type === 'funding',
      );
      expect(fundingTransactions.length).toBeGreaterThan(0);
    });

    it('should maintain target allocation', () => {
      const result = strategy.calculate(
        mockCandles,
        10000,
        '2024-01-01',
        '2024-01-31',
        {
          targetAllocation: 0.8,
          rebalanceThreshold: 0.1,
        },
      );

      // Check that final allocation is close to target
      const lastTransaction =
        result.transactions[result.transactions.length - 1];
      if (lastTransaction) {
        const totalValue =
          lastTransaction.portfolioValue.coinValue +
          lastTransaction.portfolioValue.usdcValue;
        const allocation =
          lastTransaction.portfolioValue.coinValue / totalValue;
        // Should be within threshold of target
        expect(Math.abs(allocation - 0.8)).toBeLessThan(0.2);
      }
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
      expect(result.metrics.finalValue).toBeGreaterThan(0);
    });
  });
});
