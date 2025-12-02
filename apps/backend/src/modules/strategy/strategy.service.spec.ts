import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { IStrategy } from './interfaces/strategy.interface';
import { StrategyResult } from './interfaces/strategy-result.interface';
import { Candlestick } from '../market-data/interfaces/candlestick.interface';

describe('StrategyService', () => {
  let service: StrategyService;

  const mockCandles: Candlestick[] = [
    {
      timestamp: '2024-01-01T00:00:00.000Z',
      open: 7200.5,
      high: 7350.2,
      low: 7100.1,
      close: 7280.3,
      volume: 500000,
      timeframe: '1d',
    },
  ];

  const mockStrategyResult: StrategyResult = {
    strategyId: 'test-strategy',
    strategyName: 'Test Strategy',
    parameters: {},
    transactions: [],
    metrics: {
      totalReturn: 10.5,
      avgBuyPrice: 7280.3,
      maxDrawdown: 5.2,
      finalValue: 11050,
      sharpeRatio: 1.2,
      totalInvestment: 10000,
      totalQuantity: 1.3889,
    },
    portfolioValueHistory: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StrategyService],
    }).compile();

    service = module.get<StrategyService>(StrategyService);
  });

  describe('getStrategy', () => {
    it('should return strategy for valid strategy ID', () => {
      const strategy = service.getStrategy('lump-sum');
      expect(strategy).toBeDefined();
      expect(strategy.getStrategyId()).toBe('lump-sum');
    });

    it('should throw NotFoundException for invalid strategy ID', () => {
      expect(() => service.getStrategy('invalid-strategy')).toThrow(
        NotFoundException,
      );
    });

    it('should return all registered strategies', () => {
      const strategies = service.getAllStrategies();
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some((s) => s.getStrategyId() === 'lump-sum')).toBe(
        true,
      );
      expect(strategies.some((s) => s.getStrategyId() === 'dca')).toBe(true);
      expect(
        strategies.some((s) => s.getStrategyId() === 'rebalancing'),
      ).toBe(true);
    });
  });

  describe('getAllStrategies', () => {
    it('should return all registered strategies', () => {
      const strategies = service.getAllStrategies();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBe(7); // All 7 strategies
      strategies.forEach((strategy) => {
        expect(strategy).toHaveProperty('getStrategyId');
        expect(strategy).toHaveProperty('getStrategyName');
        expect(strategy).toHaveProperty('calculate');
      });
    });
  });

  describe('getStrategyMetadata', () => {
    it('should return metadata for all strategies', () => {
      const metadata = service.getStrategyMetadata();
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata.length).toBe(7);
      metadata.forEach((meta) => {
        expect(meta).toHaveProperty('id');
        expect(meta).toHaveProperty('name');
        expect(typeof meta.id).toBe('string');
        expect(typeof meta.name).toBe('string');
      });
    });

    it('should include all registered strategies in metadata', () => {
      const metadata = service.getStrategyMetadata();
      const ids = metadata.map((m) => m.id);
      expect(ids).toContain('lump-sum');
      expect(ids).toContain('dca');
      expect(ids).toContain('rsi-dca');
      expect(ids).toContain('dip-buyer-dca');
      expect(ids).toContain('moving-average-dca');
      expect(ids).toContain('combined-smart-dca');
      expect(ids).toContain('rebalancing');
    });
  });

  describe('calculateStrategy', () => {
    it('should calculate strategy with initialPortfolio', () => {
      const initialPortfolio = {
        assets: [{ symbol: 'BTC', quantity: 0.5 }],
        usdcAmount: 5000,
      };

      const result = service.calculateStrategy(
        'lump-sum',
        mockCandles,
        initialPortfolio,
        undefined,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(result).toBeDefined();
      expect(result.strategyId).toBe('lump-sum');
      expect(result.transactions).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should calculate strategy with investmentAmount (backward compatibility)', () => {
      const result = service.calculateStrategy(
        'lump-sum',
        mockCandles,
        10000, // number instead of InitialPortfolio
        undefined,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(result).toBeDefined();
      expect(result.strategyId).toBe('lump-sum');
    });

    it('should calculate strategy with funding schedule', () => {
      const initialPortfolio = {
        assets: [],
        usdcAmount: 10000,
      };
      const fundingSchedule = {
        frequency: 'weekly' as const,
        amount: 100,
      };

      const result = service.calculateStrategy(
        'dca',
        mockCandles,
        initialPortfolio,
        fundingSchedule,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(result).toBeDefined();
      expect(result.strategyId).toBe('dca');
    });

    it('should pass parameters to strategy', () => {
      const parameters = {
        frequency: 'weekly',
      };

      const result = service.calculateStrategy(
        'dca',
        mockCandles,
        10000,
        undefined,
        '2024-01-01',
        '2024-01-31',
        parameters,
      );

      expect(result).toBeDefined();
      expect(result.parameters).toMatchObject(parameters);
    });

    it('should throw NotFoundException for invalid strategy ID', () => {
      expect(() =>
        service.calculateStrategy(
          'invalid-strategy',
          mockCandles,
          10000,
          undefined,
          '2024-01-01',
          '2024-01-31',
          {},
        ),
      ).toThrow(NotFoundException);
    });

    it('should calculate investmentAmount from portfolio correctly', () => {
      const initialPortfolio = {
        assets: [{ symbol: 'BTC', quantity: 1.0 }],
        usdcAmount: 2000,
      };
      const firstCandlePrice = mockCandles[0].close;
      const expectedInvestment = 1.0 * firstCandlePrice + 2000;

      const strategy = service.getStrategy('lump-sum');
      const calculateSpy = jest.spyOn(strategy, 'calculate');

      service.calculateStrategy(
        'lump-sum',
        mockCandles,
        initialPortfolio,
        undefined,
        '2024-01-01',
        '2024-01-31',
        {},
      );

      expect(calculateSpy).toHaveBeenCalledWith(
        mockCandles,
        expectedInvestment,
        '2024-01-01',
        '2024-01-31',
        expect.objectContaining({
          _initialPortfolio: initialPortfolio,
        }),
      );

      calculateSpy.mockRestore();
    });

    it('should handle empty candles array', () => {
      expect(() =>
        service.calculateStrategy(
          'lump-sum',
          [],
          10000,
          undefined,
          '2024-01-01',
          '2024-01-31',
          {},
        ),
      ).toThrow();
    });
  });
});

