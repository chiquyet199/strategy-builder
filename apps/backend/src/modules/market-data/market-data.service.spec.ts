import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MarketDataService } from './market-data.service';
import { Candlestick } from './entities/candlestick.entity';
import { Timeframe } from './interfaces/candlestick.interface';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let repository: jest.Mocked<Repository<Candlestick>>;

  const mockCandlestickEntity: Candlestick = {
    id: '1',
    symbol: 'BTC/USD',
    timeframe: '1d',
    timestamp: new Date('2024-01-01'),
    open: 7200.5,
    high: 7350.2,
    low: 7100.1,
    close: 7280.3,
    volume: 500000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCandlestickEntities: Candlestick[] = [
    mockCandlestickEntity,
    {
      ...mockCandlestickEntity,
      id: '2',
      timestamp: new Date('2024-01-02'),
      open: 7280.3,
      high: 7400.0,
      low: 7250.0,
      close: 7350.0,
      volume: 450000,
    },
  ];

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketDataService,
        {
          provide: getRepositoryToken(Candlestick),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MarketDataService>(MarketDataService);
    repository = module.get(getRepositoryToken(Candlestick));
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SUPPORTED_SYMBOLS;
  });

  describe('getCandles', () => {
    const symbol = 'BTC/USD';
    const timeframe: Timeframe = '1d';
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    beforeEach(() => {
      process.env.SUPPORTED_SYMBOLS = 'BTC/USD,ETH/USD';
    });

    it('should successfully retrieve candles from database', async () => {
      repository.find.mockResolvedValue(mockCandlestickEntities);

      const result = await service.getCandles(
        symbol,
        timeframe,
        startDate,
        endDate,
      );

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          symbol,
          timeframe,
          timestamp: Between(new Date(startDate), new Date(endDate)),
        },
        order: {
          timestamp: 'ASC',
        },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        timestamp: mockCandlestickEntity.timestamp.toISOString(),
        open: 7200.5,
        high: 7350.2,
        low: 7100.1,
        close: 7280.3,
        volume: 500000,
        timeframe: '1d',
      });
    });

    it('should throw error if symbol is not supported', async () => {
      await expect(
        service.getCandles('INVALID/USD', timeframe, startDate, endDate),
      ).rejects.toThrow('Symbol INVALID/USD is not supported');
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('should throw error if start date is after end date', async () => {
      await expect(
        service.getCandles(symbol, timeframe, endDate, startDate),
      ).rejects.toThrow('Start date must be before end date');
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('should throw error if end date is beyond 2025-12-31', async () => {
      await expect(
        service.getCandles(symbol, timeframe, startDate, '2026-01-01'),
      ).rejects.toThrow('End date cannot be beyond 2025-12-31');
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('should throw error if no data found in database', async () => {
      repository.find.mockResolvedValue([]);

      await expect(
        service.getCandles(symbol, timeframe, startDate, endDate),
      ).rejects.toThrow('No market data available');
      expect(repository.find).toHaveBeenCalled();
    });

    it('should use default supported symbols if env var not set', async () => {
      delete process.env.SUPPORTED_SYMBOLS;
      repository.find.mockResolvedValue(mockCandlestickEntities);

      const result = await service.getCandles(
        'BTC/USD',
        timeframe,
        startDate,
        endDate,
      );

      expect(result).toHaveLength(2);
    });

    it('should handle multiple supported symbols from env', async () => {
      process.env.SUPPORTED_SYMBOLS = 'BTC/USD,ETH/USD,BNB/USD';
      repository.find.mockResolvedValue(mockCandlestickEntities);

      const result = await service.getCandles(
        'ETH/USD',
        timeframe,
        startDate,
        endDate,
      );

      expect(result).toHaveLength(2);
    });

    it('should convert entity values to numbers correctly', async () => {
      const entityWithStringNumbers = {
        ...mockCandlestickEntity,
        open: '1000.50' as any,
        high: '2000.75' as any,
        low: '500.25' as any,
        close: '1500.00' as any,
        volume: '1000000.123' as any,
      };
      repository.find.mockResolvedValue([entityWithStringNumbers as Candlestick]);

      const result = await service.getCandles(
        symbol,
        timeframe,
        startDate,
        endDate,
      );

      expect(result[0].open).toBe(1000.5);
      expect(result[0].high).toBe(2000.75);
      expect(result[0].low).toBe(500.25);
      expect(result[0].close).toBe(1500);
      expect(result[0].volume).toBe(1000000.123);
    });

    it('should handle different timeframes', async () => {
      const timeframes: Timeframe[] = ['1h', '4h', '1d', '1w', '1m'];
      repository.find.mockResolvedValue(mockCandlestickEntities);

      for (const tf of timeframes) {
        await service.getCandles(symbol, tf, startDate, endDate);
        expect(repository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              timeframe: tf,
            }),
          }),
        );
      }
    });

    it('should order results by timestamp ascending', async () => {
      repository.find.mockResolvedValue(mockCandlestickEntities);

      await service.getCandles(symbol, timeframe, startDate, endDate);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: {
            timestamp: 'ASC',
          },
        }),
      );
    });
  });
});

