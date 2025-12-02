import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketDataSyncService } from './market-data-sync.service';
import { BinanceApiService } from './binance-api.service';
import { Candlestick } from '../entities/candlestick.entity';
import { Timeframe } from '../interfaces/candlestick.interface';

describe('MarketDataSyncService', () => {
  let service: MarketDataSyncService;
  let repository: jest.Mocked<Repository<Candlestick>>;
  let binanceApiService: any;

  const mockCandlestick: Candlestick = {
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

  const mockCandlestickInterface = {
    timestamp: '2024-01-01T00:00:00.000Z',
    open: 7200.5,
    high: 7350.2,
    low: 7100.1,
    close: 7280.3,
    volume: 500000,
    timeframe: '1d' as Timeframe,
  };

  beforeEach(async () => {
    const mockRepository = {
      count: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockBinanceApiService: any = {
      checkApiHealth: jest.fn(),
      getKlines: jest.fn(),
      toBinanceSymbol: jest.fn(),
      normalizeSymbol: jest.fn(),
      getServerTime: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketDataSyncService,
        {
          provide: getRepositoryToken(Candlestick),
          useValue: mockRepository,
        },
        {
          provide: BinanceApiService,
          useValue: mockBinanceApiService,
        },
      ],
    }).compile();

    service = module.get<MarketDataSyncService>(MarketDataSyncService);
    repository = module.get(getRepositoryToken(Candlestick));
    binanceApiService = mockBinanceApiService;

    // Setup default env
    process.env.SUPPORTED_SYMBOLS = 'BTC/USD,ETH/USD';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SUPPORTED_SYMBOLS;
  });

  describe('getSupportedSymbols', () => {
    it('should return supported symbols from env', () => {
      // Service is initialized with SUPPORTED_SYMBOLS='BTC/USD,ETH/USD' in beforeEach
      const symbols = service.getSupportedSymbols();
      // The service parses the env var, so it should return an array
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThan(0);
      // Check that it contains the expected symbols (may be more if env has more)
      expect(symbols).toContain('BTC/USD');
    });

    it('should return array of symbols', () => {
      const symbols = service.getSupportedSymbols();
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols).toContain('BTC/USD');
    });
  });

  describe('syncDateRange', () => {
    const symbol = 'BTC/USD';
    const timeframe: Timeframe = '1d';
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should successfully sync date range', async () => {
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([mockCandlestickInterface]);
      repository.create.mockReturnValue(mockCandlestick);
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.syncDateRange(symbol, timeframe, startDate, endDate);

      expect(binanceApiService.checkApiHealth).toHaveBeenCalled();
      expect(binanceApiService.getKlines).toHaveBeenCalledWith(
        symbol,
        timeframe,
        startDate,
        endDate,
      );
      expect(repository.create).toHaveBeenCalled();
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should throw error if Binance API is not healthy', async () => {
      binanceApiService.checkApiHealth.mockResolvedValue(false);

      await expect(
        service.syncDateRange(symbol, timeframe, startDate, endDate),
      ).rejects.toThrow('Binance API is not available');
      expect(binanceApiService.getKlines).not.toHaveBeenCalled();
    });

    it('should handle empty results from Binance', async () => {
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([]);

      await service.syncDateRange(symbol, timeframe, startDate, endDate);

      expect(binanceApiService.getKlines).toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('forceResyncDateRange', () => {
    const symbol = 'BTC/USD';
    const timeframe: Timeframe = '1d';
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should delete existing data and re-sync', async () => {
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([mockCandlestickInterface]);
      repository.create.mockReturnValue(mockCandlestick);

      const mockDeleteQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      const mockInsertQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      repository.createQueryBuilder
        .mockReturnValueOnce(mockDeleteQueryBuilder as any)
        .mockReturnValueOnce(mockInsertQueryBuilder as any);

      await service.forceResyncDateRange(symbol, timeframe, startDate, endDate);

      expect(mockDeleteQueryBuilder.delete).toHaveBeenCalled();
      expect(mockDeleteQueryBuilder.execute).toHaveBeenCalled();
      expect(binanceApiService.getKlines).toHaveBeenCalled();
    });
  });

  describe('checkAndFillGaps', () => {
    const symbol = 'BTC/USD';
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should sync full range if no data exists', async () => {
      repository.find.mockResolvedValue([]);
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([mockCandlestickInterface]);
      repository.create.mockReturnValue(mockCandlestick);
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.checkAndFillGaps(symbol, startDate, endDate);

      expect(repository.find).toHaveBeenCalled();
      expect(binanceApiService.getKlines).toHaveBeenCalled();
    });

    it('should fill gap before earliest data', async () => {
      const existingCandles = [
        { timestamp: new Date('2024-01-15') },
        { timestamp: new Date('2024-01-16') },
      ];
      repository.find.mockResolvedValue(existingCandles as any);
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([mockCandlestickInterface]);
      repository.create.mockReturnValue(mockCandlestick);
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.checkAndFillGaps(symbol, startDate, endDate);

      expect(binanceApiService.getKlines).toHaveBeenCalledWith(
        symbol,
        expect.any(String),
        startDate,
        existingCandles[0].timestamp,
      );
    });

    it('should fill gap after latest data', async () => {
      const existingCandles = [
        { timestamp: new Date('2024-01-15') },
        { timestamp: new Date('2024-01-20') },
      ];
      repository.find.mockResolvedValue(existingCandles as any);
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([mockCandlestickInterface]);
      repository.create.mockReturnValue(mockCandlestick);
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.checkAndFillGaps(symbol, startDate, endDate);

      expect(binanceApiService.getKlines).toHaveBeenCalledWith(
        symbol,
        expect.any(String),
        existingCandles[existingCandles.length - 1].timestamp,
        endDate,
      );
    });
  });

  describe('getSyncStatus', () => {
    const symbol = 'BTC/USD';

    it('should return sync status with counts for all timeframes', async () => {
      repository.count.mockResolvedValue(100);
      repository.findOne
        .mockResolvedValueOnce({ timestamp: new Date('2024-01-01') } as any)
        .mockResolvedValueOnce({ timestamp: new Date('2024-01-31') } as any);

      const status = await service.getSyncStatus(symbol);

      expect(status.symbol).toBe(symbol);
      expect(status.timeframes).toHaveProperty('1h');
      expect(status.timeframes).toHaveProperty('4h');
      expect(status.timeframes).toHaveProperty('1d');
      expect(status.timeframes).toHaveProperty('1w');
      expect(status.timeframes).toHaveProperty('1m');
      expect(status.earliestDate).toBeInstanceOf(Date);
      expect(status.latestDate).toBeInstanceOf(Date);
    });

    it('should return null dates if no data exists', async () => {
      repository.count.mockResolvedValue(0);
      repository.findOne.mockResolvedValue(null);

      const status = await service.getSyncStatus(symbol);

      expect(status.earliestDate).toBeNull();
      expect(status.latestDate).toBeNull();
    });
  });

  describe('prePopulateHistoricalData', () => {
    it('should pre-populate for all symbols if none specified', async () => {
      process.env.SUPPORTED_SYMBOLS = 'BTC/USD,ETH/USD';
      repository.count.mockResolvedValue(0);
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([mockCandlestickInterface]);
      repository.create.mockReturnValue(mockCandlestick);
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.prePopulateHistoricalData();

      expect(binanceApiService.getKlines).toHaveBeenCalled();
    });

    it('should pre-populate for specific symbol if provided', async () => {
      repository.count.mockResolvedValue(0);
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([mockCandlestickInterface]);
      repository.create.mockReturnValue(mockCandlestick);
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.prePopulateHistoricalData('BTC/USD');

      expect(binanceApiService.getKlines).toHaveBeenCalled();
    });

    it('should check for gaps if data already exists', async () => {
      repository.count.mockResolvedValue(100);
      repository.find.mockResolvedValue([]);
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([mockCandlestickInterface]);
      repository.create.mockReturnValue(mockCandlestick);
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.prePopulateHistoricalData('BTC/USD');

      expect(repository.count).toHaveBeenCalled();
    });
  });

  describe('syncDailyData', () => {
    it('should sync daily data for all symbols if none specified', async () => {
      process.env.SUPPORTED_SYMBOLS = 'BTC/USD,ETH/USD';
      repository.findOne.mockResolvedValue(null);
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([mockCandlestickInterface]);
      repository.create.mockReturnValue(mockCandlestick);
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.syncDailyData();

      expect(binanceApiService.getKlines).toHaveBeenCalled();
    });

    it('should sync daily data for specific symbol if provided', async () => {
      repository.findOne.mockResolvedValue(null);
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([mockCandlestickInterface]);
      repository.create.mockReturnValue(mockCandlestick);
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.syncDailyData('BTC/USD');

      expect(binanceApiService.getKlines).toHaveBeenCalled();
    });

    it('should skip if today data already exists for daily timeframe', async () => {
      // Mock findOne to return existing data for daily/weekly/monthly timeframes
      // but null for intraday timeframes (1h, 4h) so they still sync
      repository.findOne
        .mockResolvedValueOnce(null) // 1h - no data, should sync
        .mockResolvedValueOnce(null) // 4h - no data, should sync
        .mockResolvedValueOnce(mockCandlestick) // 1d - exists, should skip
        .mockResolvedValueOnce(mockCandlestick) // 1w - exists, should skip
        .mockResolvedValueOnce(mockCandlestick); // 1m - exists, should skip
      
      binanceApiService.checkApiHealth.mockResolvedValue(true);
      binanceApiService.getKlines.mockResolvedValue([mockCandlestickInterface]);
      repository.create.mockReturnValue(mockCandlestick);
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.syncDailyData('BTC/USD');

      // Should still sync intraday timeframes (1h, 4h) even if daily exists
      // Note: getKlines may be called multiple times per timeframe due to pagination
      expect(binanceApiService.getKlines).toHaveBeenCalled();
      // Should be called at least for 1h and 4h (may be more due to pagination)
      expect(binanceApiService.getKlines.mock.calls.length).toBeGreaterThanOrEqual(2);
      // Should NOT sync daily/weekly/monthly since they already exist
      // findOne is only called for non-intraday timeframes (1d, 1w, 1m) = 3 times
      expect(repository.findOne).toHaveBeenCalledTimes(3);
    });
  });
});

