import { MetricsCalculator } from './metrics-calculator';
import {
  Transaction,
  PortfolioValuePoint,
} from '../interfaces/strategy-result.interface';
import { StrategyException } from '../../../common/exceptions/strategy.exception';

describe('MetricsCalculator', () => {
  describe('calculate', () => {
    it('should throw error if portfolio history is empty', () => {
      const transactions: Transaction[] = [];
      const portfolioHistory: PortfolioValuePoint[] = [];
      const totalInvestment = 10000;

      expect(() =>
        MetricsCalculator.calculate(
          transactions,
          portfolioHistory,
          totalInvestment,
        ),
      ).toThrow(StrategyException);
      expect(() =>
        MetricsCalculator.calculate(
          transactions,
          portfolioHistory,
          totalInvestment,
        ),
      ).toThrow('Portfolio history is empty');
    });

    it('should calculate metrics correctly for profitable strategy', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-01',
          type: 'buy',
          price: 100,
          amount: 10000,
          quantityPurchased: 100,
          portfolioValue: {
            coinValue: 10000,
            usdcValue: 0,
            totalValue: 10000,
            quantityHeld: 100,
          },
        },
      ];

      const portfolioHistory: PortfolioValuePoint[] = [
        { date: '2024-01-01', value: 10000, quantityHeld: 100, price: 100 },
        { date: '2024-01-02', value: 11000, quantityHeld: 100, price: 110 },
        { date: '2024-01-03', value: 12000, quantityHeld: 100, price: 120 },
      ];

      const totalInvestment = 10000;

      const metrics = MetricsCalculator.calculate(
        transactions,
        portfolioHistory,
        totalInvestment,
      );

      expect(metrics.totalReturn).toBe(20); // (12000 - 10000) / 10000 * 100
      expect(metrics.avgBuyPrice).toBe(100); // 10000 / 100
      expect(metrics.finalValue).toBe(12000);
      expect(metrics.totalInvestment).toBe(10000);
      expect(metrics.totalQuantity).toBe(100);
    });

    it('should calculate metrics correctly for losing strategy', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-01',
          type: 'buy',
          price: 100,
          amount: 10000,
          quantityPurchased: 100,
          portfolioValue: {
            coinValue: 10000,
            usdcValue: 0,
            totalValue: 10000,
            quantityHeld: 100,
          },
        },
      ];

      const portfolioHistory: PortfolioValuePoint[] = [
        { date: '2024-01-01', value: 10000, quantityHeld: 100, price: 100 },
        { date: '2024-01-02', value: 9000, quantityHeld: 100, price: 90 },
        { date: '2024-01-03', value: 8000, quantityHeld: 100, price: 80 },
      ];

      const totalInvestment = 10000;

      const metrics = MetricsCalculator.calculate(
        transactions,
        portfolioHistory,
        totalInvestment,
      );

      expect(metrics.totalReturn).toBe(-20); // (8000 - 10000) / 10000 * 100
      expect(metrics.avgBuyPrice).toBe(100);
      expect(metrics.finalValue).toBe(8000);
    });

    it('should calculate max drawdown correctly', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-01',
          type: 'buy',
          price: 100,
          amount: 10000,
          quantityPurchased: 100,
          portfolioValue: {
            coinValue: 10000,
            usdcValue: 0,
            totalValue: 10000,
            quantityHeld: 100,
          },
        },
      ];

      const portfolioHistory: PortfolioValuePoint[] = [
        { date: '2024-01-01', value: 10000, quantityHeld: 100, price: 100 }, // Peak
        { date: '2024-01-02', value: 12000, quantityHeld: 100, price: 120 }, // New peak
        { date: '2024-01-03', value: 8000, quantityHeld: 100, price: 80 }, // Drawdown from 12000
        { date: '2024-01-04', value: 10000, quantityHeld: 100, price: 100 },
      ];

      const totalInvestment = 10000;

      const metrics = MetricsCalculator.calculate(
        transactions,
        portfolioHistory,
        totalInvestment,
      );

      // Max drawdown: (12000 - 8000) / 12000 * 100 = 33.33%
      expect(metrics.maxDrawdown).toBeCloseTo(33.33, 1);
    });

    it('should calculate Sharpe ratio correctly', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-01',
          type: 'buy',
          price: 100,
          amount: 10000,
          quantityPurchased: 100,
          portfolioValue: {
            coinValue: 10000,
            usdcValue: 0,
            totalValue: 10000,
            quantityHeld: 100,
          },
        },
      ];

      // Create portfolio history with consistent positive returns
      const portfolioHistory: PortfolioValuePoint[] = [
        { date: '2024-01-01', value: 10000, quantityHeld: 100, price: 100 },
        { date: '2024-01-02', value: 10100, quantityHeld: 100, price: 101 }, // +1%
        { date: '2024-01-03', value: 10200, quantityHeld: 100, price: 102 }, // +1%
        { date: '2024-01-04', value: 10300, quantityHeld: 100, price: 103 }, // +1%
      ];

      const totalInvestment = 10000;

      const metrics = MetricsCalculator.calculate(
        transactions,
        portfolioHistory,
        totalInvestment,
      );

      // Sharpe ratio should be positive for consistent positive returns
      expect(metrics.sharpeRatio).toBeGreaterThan(0);
    });

    it('should handle multiple buy transactions for average buy price', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-01',
          type: 'buy',
          price: 100,
          amount: 5000,
          quantityPurchased: 50,
          portfolioValue: {
            coinValue: 5000,
            usdcValue: 5000,
            totalValue: 10000,
            quantityHeld: 50,
          },
        },
        {
          date: '2024-01-02',
          type: 'buy',
          price: 200,
          amount: 10000,
          quantityPurchased: 50,
          portfolioValue: {
            coinValue: 20000,
            usdcValue: 0,
            totalValue: 20000,
            quantityHeld: 100,
          },
        },
      ];

      const portfolioHistory: PortfolioValuePoint[] = [
        { date: '2024-01-01', value: 10000, quantityHeld: 50, price: 200 },
        { date: '2024-01-02', value: 20000, quantityHeld: 100, price: 200 },
      ];

      const totalInvestment = 15000;

      const metrics = MetricsCalculator.calculate(
        transactions,
        portfolioHistory,
        totalInvestment,
      );

      // Average buy price: (5000 + 10000) / (50 + 50) = 150
      expect(metrics.avgBuyPrice).toBe(150);
      expect(metrics.totalQuantity).toBe(100);
    });

    it('should exclude sell transactions from average buy price calculation', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-01',
          type: 'buy',
          price: 100,
          amount: 10000,
          quantityPurchased: 100,
          portfolioValue: {
            coinValue: 10000,
            usdcValue: 0,
            totalValue: 10000,
            quantityHeld: 100,
          },
        },
        {
          date: '2024-01-02',
          type: 'sell',
          price: 120,
          amount: 6000,
          quantityPurchased: -50,
          portfolioValue: {
            coinValue: 6000,
            usdcValue: 6000,
            totalValue: 12000,
            quantityHeld: 50,
          },
        },
      ];

      const portfolioHistory: PortfolioValuePoint[] = [
        { date: '2024-01-01', value: 10000, quantityHeld: 100, price: 100 },
        { date: '2024-01-02', value: 12000, quantityHeld: 50, price: 240 },
      ];

      const totalInvestment = 10000;

      const metrics = MetricsCalculator.calculate(
        transactions,
        portfolioHistory,
        totalInvestment,
      );

      // Average buy price should only consider buy transactions: 10000 / 100 = 100
      expect(metrics.avgBuyPrice).toBe(100);
    });

    it('should exclude funding transactions from average buy price calculation', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-01',
          type: 'buy',
          price: 100,
          amount: 10000,
          quantityPurchased: 100,
          portfolioValue: {
            coinValue: 10000,
            usdcValue: 0,
            totalValue: 10000,
            quantityHeld: 100,
          },
        },
        {
          date: '2024-01-02',
          type: 'funding',
          price: 100,
          amount: 5000,
          quantityPurchased: 0,
          portfolioValue: {
            coinValue: 10000,
            usdcValue: 5000,
            totalValue: 15000,
            quantityHeld: 100,
          },
        },
      ];

      const portfolioHistory: PortfolioValuePoint[] = [
        { date: '2024-01-01', value: 10000, quantityHeld: 100, price: 100 },
        { date: '2024-01-02', value: 15000, quantityHeld: 100, price: 150 },
      ];

      const totalInvestment = 10000;

      const metrics = MetricsCalculator.calculate(
        transactions,
        portfolioHistory,
        totalInvestment,
      );

      // Average buy price should only consider buy transactions: 10000 / 100 = 100
      expect(metrics.avgBuyPrice).toBe(100);
    });

    it('should handle transactions without type (backward compatibility)', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-01',
          price: 100,
          amount: 10000,
          quantityPurchased: 100,
          portfolioValue: {
            coinValue: 10000,
            usdcValue: 0,
            totalValue: 10000,
            quantityHeld: 100,
          },
        },
      ];

      const portfolioHistory: PortfolioValuePoint[] = [
        { date: '2024-01-01', value: 10000, quantityHeld: 100, price: 100 },
        { date: '2024-01-02', value: 11000, quantityHeld: 100, price: 110 },
      ];

      const totalInvestment = 10000;

      const metrics = MetricsCalculator.calculate(
        transactions,
        portfolioHistory,
        totalInvestment,
      );

      // Transactions without type should be treated as buy
      expect(metrics.avgBuyPrice).toBe(100);
      expect(metrics.totalReturn).toBe(10);
    });

    it('should return 0 for average buy price if no buy transactions', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-01',
          type: 'sell',
          price: 100,
          amount: 5000,
          quantityPurchased: -50,
          portfolioValue: {
            coinValue: 5000,
            usdcValue: 5000,
            totalValue: 10000,
            quantityHeld: 50,
          },
        },
      ];

      const portfolioHistory: PortfolioValuePoint[] = [
        { date: '2024-01-01', value: 10000, quantityHeld: 50, price: 200 },
      ];

      const totalInvestment = 10000;

      const metrics = MetricsCalculator.calculate(
        transactions,
        portfolioHistory,
        totalInvestment,
      );

      expect(metrics.avgBuyPrice).toBe(0);
    });

    it('should calculate Sharpe ratio as 0 for single data point', () => {
      const transactions: Transaction[] = [];
      const portfolioHistory: PortfolioValuePoint[] = [
        { date: '2024-01-01', value: 10000, quantityHeld: 100, price: 100 },
      ];
      const totalInvestment = 10000;

      const metrics = MetricsCalculator.calculate(
        transactions,
        portfolioHistory,
        totalInvestment,
      );

      expect(metrics.sharpeRatio).toBe(0);
    });

    it('should handle negative returns in Sharpe ratio calculation', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-01',
          type: 'buy',
          price: 100,
          amount: 10000,
          quantityPurchased: 100,
          portfolioValue: {
            coinValue: 10000,
            usdcValue: 0,
            totalValue: 10000,
            quantityHeld: 100,
          },
        },
      ];

      const portfolioHistory: PortfolioValuePoint[] = [
        { date: '2024-01-01', value: 10000, quantityHeld: 100, price: 100 },
        { date: '2024-01-02', value: 9900, quantityHeld: 100, price: 99 }, // -1%
        { date: '2024-01-03', value: 9800, quantityHeld: 100, price: 98 }, // -1%
      ];

      const totalInvestment = 10000;

      const metrics = MetricsCalculator.calculate(
        transactions,
        portfolioHistory,
        totalInvestment,
      );

      // Sharpe ratio should handle negative returns
      expect(metrics.sharpeRatio).toBeDefined();
      expect(metrics.totalReturn).toBe(-2);
    });
  });
});
