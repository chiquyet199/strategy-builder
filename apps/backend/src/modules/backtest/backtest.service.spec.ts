import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BacktestService } from './backtest.service';
import { MarketDataService } from '../market-data/market-data.service';
import { StrategyService } from '../strategy/strategy.service';
import { CompareStrategiesDto } from './dto/compare-strategies.dto';
import { StrategyResult } from '../strategy/interfaces/strategy-result.interface';

describe('BacktestService', () => {
  let service: BacktestService;
  let marketDataService: any;
  let strategyService: any;

  const mockCandles = [
    {
      timestamp: '2024-01-01T00:00:00.000Z',
      open: 7200.5,
      high: 7350.2,
      low: 7100.1,
      close: 7280.3,
      volume: 500000,
      timeframe: '1d' as const,
    },
    {
      timestamp: '2024-01-02T00:00:00.000Z',
      open: 7280.3,
      high: 7400.0,
      low: 7250.0,
      close: 7350.0,
      volume: 450000,
      timeframe: '1d' as const,
    },
  ];

  const mockStrategyResult: StrategyResult = {
    strategyId: 'lump-sum',
    strategyName: 'Lump Sum',
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
    const mockMarketDataService = {
      getCandles: jest.fn(),
    };

    const mockStrategyService = {
      calculateStrategy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BacktestService,
        {
          provide: MarketDataService,
          useValue: mockMarketDataService,
        },
        {
          provide: StrategyService,
          useValue: mockStrategyService,
        },
      ],
    }).compile();

    service = module.get<BacktestService>(BacktestService);
    marketDataService = mockMarketDataService as any;
    strategyService = mockStrategyService as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('compareStrategies', () => {
    const baseDto: CompareStrategiesDto = {
      strategies: [
        {
          strategyId: 'lump-sum',
          parameters: {},
        },
      ],
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    it('should successfully compare strategies with investmentAmount', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
        investmentAmount: 10000,
      };

      marketDataService.getCandles.mockResolvedValue(mockCandles);
      strategyService.calculateStrategy.mockResolvedValue(mockStrategyResult);

      const result = await service.compareStrategies(dto);

      expect(marketDataService.getCandles).toHaveBeenCalledWith(
        'BTC/USD',
        '1d',
        dto.startDate,
        dto.endDate,
      );
      expect(strategyService.calculateStrategy).toHaveBeenCalledWith(
        'lump-sum',
        mockCandles,
        { assets: [], usdcAmount: 10000 },
        undefined,
        dto.startDate,
        dto.endDate,
        {},
      );
      expect(result.results).toHaveLength(1);
      expect(result.metadata.investmentAmount).toBe(10000);
    });

    it('should successfully compare strategies with initialPortfolio', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
        initialPortfolio: {
          assets: [{ symbol: 'BTC', quantity: 0.5 }],
          usdcAmount: 5000,
        },
      };

      marketDataService.getCandles.mockResolvedValue(mockCandles);
      strategyService.calculateStrategy.mockResolvedValue(mockStrategyResult);

      const result = await service.compareStrategies(dto);

      expect(strategyService.calculateStrategy).toHaveBeenCalledWith(
        'lump-sum',
        mockCandles,
        { assets: [{ symbol: 'BTC', quantity: 0.5 }], usdcAmount: 5000 },
        undefined,
        dto.startDate,
        dto.endDate,
        {},
      );
      const btcValue = 0.5 * mockCandles[0].close;
      expect(result.metadata.investmentAmount).toBe(btcValue + 5000);
    });

    it('should throw BadRequestException if neither investmentAmount nor initialPortfolio provided', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
      };

      await expect(service.compareStrategies(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(marketDataService.getCandles).not.toHaveBeenCalled();
    });

    it('should normalize funding schedule when amount > 0', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
        investmentAmount: 10000,
        fundingSchedule: {
          frequency: 'weekly',
          amount: 100,
        },
      };

      marketDataService.getCandles.mockResolvedValue(mockCandles);
      strategyService.calculateStrategy.mockResolvedValue(mockStrategyResult);

      await service.compareStrategies(dto);

      expect(strategyService.calculateStrategy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
        { frequency: 'weekly', amount: 100 },
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should not include funding schedule when amount is 0', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
        investmentAmount: 10000,
        fundingSchedule: {
          frequency: 'weekly',
          amount: 0,
        },
      };

      marketDataService.getCandles.mockResolvedValue(mockCandles);
      strategyService.calculateStrategy.mockResolvedValue(mockStrategyResult);

      await service.compareStrategies(dto);

      expect(strategyService.calculateStrategy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
        undefined,
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should use default timeframe if not provided', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
        investmentAmount: 10000,
      };

      marketDataService.getCandles.mockResolvedValue(mockCandles);
      strategyService.calculateStrategy.mockResolvedValue(mockStrategyResult);

      await service.compareStrategies(dto);

      expect(marketDataService.getCandles).toHaveBeenCalledWith(
        'BTC/USD',
        '1d',
        dto.startDate,
        dto.endDate,
      );
    });

    it('should use provided timeframe', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
        investmentAmount: 10000,
        timeframe: '1h',
      };

      marketDataService.getCandles.mockResolvedValue(mockCandles);
      strategyService.calculateStrategy.mockResolvedValue(mockStrategyResult);

      await service.compareStrategies(dto);

      expect(marketDataService.getCandles).toHaveBeenCalledWith(
        'BTC/USD',
        '1h',
        dto.startDate,
        dto.endDate,
      );
    });

    it('should throw error if no market data available', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
        investmentAmount: 10000,
      };

      marketDataService.getCandles.mockResolvedValue([]);

      await expect(service.compareStrategies(dto)).rejects.toThrow(
        'No market data available',
      );
      expect(strategyService.calculateStrategy).not.toHaveBeenCalled();
    });

    it('should handle multiple strategies', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
        investmentAmount: 10000,
        strategies: [
          { strategyId: 'lump-sum', parameters: {} },
          { strategyId: 'dca', parameters: {} },
        ],
      };

      marketDataService.getCandles.mockResolvedValue(mockCandles);
      strategyService.calculateStrategy
        .mockResolvedValueOnce(mockStrategyResult)
        .mockResolvedValueOnce({ ...mockStrategyResult, strategyId: 'dca' });

      const result = await service.compareStrategies(dto);

      expect(strategyService.calculateStrategy).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(2);
    });

    it('should preserve variant name if provided', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
        investmentAmount: 10000,
        strategies: [
          {
            strategyId: 'lump-sum',
            variantName: 'Test Variant',
            parameters: {},
          },
        ],
      };

      marketDataService.getCandles.mockResolvedValue(mockCandles);
      strategyService.calculateStrategy.mockResolvedValue(mockStrategyResult);

      const result = await service.compareStrategies(dto);

      expect(result.results[0].variantName).toBe('Test Variant');
    });

    it('should calculate total initial value correctly with BTC assets', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
        initialPortfolio: {
          assets: [{ symbol: 'BTC', quantity: 1.0 }],
          usdcAmount: 2000,
        },
      };

      marketDataService.getCandles.mockResolvedValue(mockCandles);
      strategyService.calculateStrategy.mockResolvedValue(mockStrategyResult);

      const result = await service.compareStrategies(dto);

      const expectedValue = 1.0 * mockCandles[0].close + 2000;
      expect(result.metadata.investmentAmount).toBe(expectedValue);
    });

    it('should handle strategy calculation errors', async () => {
      const dto: CompareStrategiesDto = {
        ...baseDto,
        investmentAmount: 10000,
      };

      marketDataService.getCandles.mockResolvedValue(mockCandles);
      strategyService.calculateStrategy.mockRejectedValue(
        new Error('Strategy calculation failed'),
      );

      await expect(service.compareStrategies(dto)).rejects.toThrow(
        'Strategy calculation failed',
      );
    });
  });
});
