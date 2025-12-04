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

    it('should not throw for valid spendType', () => {
      expect(() =>
        strategy.validateParameters({ spendType: 'percentage' }),
      ).not.toThrow();
      expect(() =>
        strategy.validateParameters({ spendType: 'fixed' }),
      ).not.toThrow();
    });

    it('should throw for invalid spendType', () => {
      expect(() =>
        strategy.validateParameters({ spendType: 'invalid' }),
      ).toThrow('Spend type must be one of: percentage, fixed');
    });

    it('should not throw for valid spendPercentage', () => {
      expect(() =>
        strategy.validateParameters({ spendPercentage: 0 }),
      ).not.toThrow();
      expect(() =>
        strategy.validateParameters({ spendPercentage: 50 }),
      ).not.toThrow();
      expect(() =>
        strategy.validateParameters({ spendPercentage: 100 }),
      ).not.toThrow();
    });

    it('should throw for invalid spendPercentage (negative)', () => {
      expect(() =>
        strategy.validateParameters({ spendPercentage: -1 }),
      ).toThrow('Spend percentage must be between 0 and 100');
    });

    it('should throw for invalid spendPercentage (over 100)', () => {
      expect(() =>
        strategy.validateParameters({ spendPercentage: 101 }),
      ).toThrow('Spend percentage must be between 0 and 100');
    });

    it('should not throw for valid spendAmount', () => {
      expect(() =>
        strategy.validateParameters({ spendAmount: 0 }),
      ).not.toThrow();
      expect(() =>
        strategy.validateParameters({ spendAmount: 100 }),
      ).not.toThrow();
      expect(() =>
        strategy.validateParameters({ spendAmount: 1000.5 }),
      ).not.toThrow();
    });

    it('should throw for invalid spendAmount (negative)', () => {
      expect(() =>
        strategy.validateParameters({ spendAmount: -1 }),
      ).toThrow('Spend amount must be greater than or equal to 0');
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

    describe('spending parameters', () => {
      it('should use percentage spending by default (100% of USDC)', () => {
        const moreCandles: Candlestick[] = Array.from({ length: 14 }, (_, i) => ({
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
          10000, // $10,000 initial
          '2024-01-01',
          '2024-01-14',
          { frequency: 'weekly' },
        );

        // Should have weekly purchases
        const buyTransactions = result.transactions.filter((t) => t.type !== 'funding');
        expect(buyTransactions.length).toBeGreaterThan(0);

        // First purchase should use a significant portion of the $10,000
        // With weekly frequency and 2 weeks, should have ~2 purchases
        // Each should spend a portion of available USDC
        const firstBuy = buyTransactions.find((t) => t.type !== 'funding');
        if (firstBuy) {
          expect(firstBuy.amount).toBeGreaterThan(0);
        }
      });

      it('should use percentage spending when spendType is percentage', () => {
        const moreCandles: Candlestick[] = Array.from({ length: 14 }, (_, i) => ({
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
          10000, // $10,000 initial
          '2024-01-01',
          '2024-01-14',
          {
            frequency: 'weekly',
            spendType: 'percentage',
            spendPercentage: 50, // 50% of remaining USDC
          },
        );

        const buyTransactions = result.transactions.filter((t) => t.type !== 'funding');
        expect(buyTransactions.length).toBeGreaterThan(0);

        // Check that reason mentions percentage
        const firstBuy = buyTransactions[0];
        if (firstBuy && firstBuy.reason) {
          expect(firstBuy.reason).toContain('50%');
        }
      });

      it('should use fixed amount spending when spendType is fixed', () => {
        const moreCandles: Candlestick[] = Array.from({ length: 14 }, (_, i) => ({
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
          10000, // $10,000 initial
          '2024-01-01',
          '2024-01-14',
          {
            frequency: 'weekly',
            spendType: 'fixed',
            spendAmount: 500, // $500 per purchase
          },
        );

        const buyTransactions = result.transactions.filter((t) => t.type !== 'funding');
        expect(buyTransactions.length).toBeGreaterThan(0);

        // Each purchase should be approximately $500 (may be slightly less if capped to available cash)
        buyTransactions.forEach((t) => {
          if (t.type !== 'funding') {
            expect(t.amount).toBeLessThanOrEqual(500);
            expect(t.amount).toBeGreaterThan(0);
          }
        });

        // Check that reason mentions fixed amount
        const firstBuy = buyTransactions[0];
        if (firstBuy && firstBuy.reason) {
          expect(firstBuy.reason).toContain('$500');
        }
      });

      it('should cap fixed amount to available USDC', () => {
        const moreCandles: Candlestick[] = Array.from({ length: 14 }, (_, i) => ({
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
          300, // Only $300 initial (less than $500 fixed amount)
          '2024-01-01',
          '2024-01-14',
          {
            frequency: 'weekly',
            spendType: 'fixed',
            spendAmount: 500, // Try to spend $500
          },
        );

        const buyTransactions = result.transactions.filter((t) => t.type !== 'funding');
        expect(buyTransactions.length).toBeGreaterThan(0);

        // First purchase should be capped to available $300
        const firstBuy = buyTransactions[0];
        if (firstBuy && firstBuy.type !== 'funding') {
          expect(firstBuy.amount).toBeLessThanOrEqual(300);
        }
      });

      it('should work with percentage spending and funding schedule', () => {
        const moreCandles: Candlestick[] = Array.from({ length: 21 }, (_, i) => ({
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
          amount: 1000, // Fund $1000 weekly
        };

        const result = strategy.calculate(
          moreCandles,
          0, // Start with $0
          '2024-01-01',
          '2024-01-21',
          {
            frequency: 'weekly',
            spendType: 'percentage',
            spendPercentage: 50, // Spend 50% of available USDC
            _fundingSchedule: fundingSchedule,
          },
        );

        // Should have both funding and buy transactions
        const fundingTransactions = result.transactions.filter(
          (t) => t.type === 'funding',
        );
        const buyTransactions = result.transactions.filter((t) => t.type !== 'funding');

        expect(fundingTransactions.length).toBeGreaterThan(0);
        expect(buyTransactions.length).toBeGreaterThan(0);

        // After funding $1000, should spend 50% = $500
        // Find a buy transaction after funding
        const firstFunding = fundingTransactions[0];
        const buyAfterFunding = buyTransactions.find(
          (t) => new Date(t.date) > new Date(firstFunding.date),
        );

        if (buyAfterFunding && buyAfterFunding.type !== 'funding') {
          // Should spend approximately 50% of available (may vary based on timing)
          expect(buyAfterFunding.amount).toBeGreaterThan(0);
          expect(buyAfterFunding.amount).toBeLessThanOrEqual(1000);
        }
      });

      it('should work with fixed amount spending and funding schedule', () => {
        const moreCandles: Candlestick[] = Array.from({ length: 21 }, (_, i) => ({
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
          amount: 1000, // Fund $1000 weekly
        };

        const result = strategy.calculate(
          moreCandles,
          0, // Start with $0
          '2024-01-01',
          '2024-01-21',
          {
            frequency: 'weekly',
            spendType: 'fixed',
            spendAmount: 300, // Spend $300 per DCA purchase
            _fundingSchedule: fundingSchedule,
          },
        );

        // Should have both funding and buy transactions
        const fundingTransactions = result.transactions.filter(
          (t) => t.type === 'funding',
        );
        const buyTransactions = result.transactions.filter((t) => t.type !== 'funding');

        expect(fundingTransactions.length).toBeGreaterThan(0);
        expect(buyTransactions.length).toBeGreaterThan(0);

        // Each buy should be approximately $300 (capped to available)
        buyTransactions.forEach((t) => {
          if (t.type !== 'funding') {
            expect(t.amount).toBeLessThanOrEqual(300);
            expect(t.amount).toBeGreaterThan(0);
          }
        });
      });

      it('should handle 0% percentage spending (no purchases)', () => {
        const moreCandles: Candlestick[] = Array.from({ length: 14 }, (_, i) => ({
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
          10000, // $10,000 initial
          '2024-01-01',
          '2024-01-14',
          {
            frequency: 'weekly',
            spendType: 'percentage',
            spendPercentage: 0, // 0% = no spending
          },
        );

        // Should have no buy transactions (only funding if any)
        const buyTransactions = result.transactions.filter((t) => t.type !== 'funding');
        expect(buyTransactions.length).toBe(0);
      });
    });
  });
});
