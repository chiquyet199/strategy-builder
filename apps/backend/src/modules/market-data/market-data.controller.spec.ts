import { Test, TestingModule } from '@nestjs/testing';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { MarketDataSyncService } from './services/market-data-sync.service';

describe('MarketDataController', () => {
  let controller: MarketDataController;
  let marketDataService: jest.Mocked<MarketDataService>;
  let marketDataSyncService: jest.Mocked<MarketDataSyncService>;

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
  ];

  beforeEach(async () => {
    const mockMarketDataService = {
      getCandles: jest.fn(),
    };

    const mockMarketDataSyncService = {
      getSyncStatus: jest.fn(),
      syncDailyData: jest.fn(),
      prePopulateHistoricalData: jest.fn(),
      syncDateRange: jest.fn(),
      checkAndFillGaps: jest.fn(),
      forceResyncDateRange: jest.fn(),
      getSupportedSymbols: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketDataController],
      providers: [
        {
          provide: MarketDataService,
          useValue: mockMarketDataService,
        },
        {
          provide: MarketDataSyncService,
          useValue: mockMarketDataSyncService,
        },
      ],
    }).compile();

    controller = module.get<MarketDataController>(MarketDataController);
    marketDataService = module.get(MarketDataService);
    marketDataSyncService = module.get(MarketDataSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCandles', () => {
    it('should return candles from service', async () => {
      marketDataService.getCandles.mockResolvedValue(mockCandles);

      const result = await controller.getCandles({
        symbol: 'BTC/USD',
        timeframe: '1d',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(marketDataService.getCandles).toHaveBeenCalledWith(
        'BTC/USD',
        '1d',
        '2024-01-01',
        '2024-01-31',
      );
      expect(result).toEqual(mockCandles);
    });

    it('should use default symbol and timeframe if not provided', async () => {
      marketDataService.getCandles.mockResolvedValue(mockCandles);

      await controller.getCandles({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(marketDataService.getCandles).toHaveBeenCalledWith(
        'BTC/USD',
        '1d',
        '2024-01-01',
        '2024-01-31',
      );
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status', async () => {
      const mockStatus = {
        symbol: 'BTC/USD',
        timeframes: { '1h': 100, '4h': 50, '1d': 200, '1w': 20, '1m': 5 },
        earliestDate: new Date('2024-01-01'),
        latestDate: new Date('2024-01-31'),
      };
      marketDataSyncService.getSyncStatus.mockResolvedValue(mockStatus);
      marketDataSyncService.getSupportedSymbols.mockReturnValue([
        'BTC/USD',
        'ETH/USD',
      ]);

      const result = await controller.getSyncStatus('BTC/USD');

      expect(marketDataSyncService.getSyncStatus).toHaveBeenCalledWith(
        'BTC/USD',
      );
      expect(result).toMatchObject({
        ...mockStatus,
        supportedSymbols: ['BTC/USD', 'ETH/USD'],
      });
    });
  });

  describe('triggerDailySync', () => {
    it('should trigger daily sync for all symbols', async () => {
      marketDataSyncService.syncDailyData.mockResolvedValue(undefined);

      const result = await controller.triggerDailySync({});

      expect(marketDataSyncService.syncDailyData).toHaveBeenCalledWith(
        undefined,
      );
      expect(result.message).toContain('Daily sync completed');
    });

    it('should trigger daily sync for specific symbol', async () => {
      marketDataSyncService.syncDailyData.mockResolvedValue(undefined);

      const result = await controller.triggerDailySync({ symbol: 'BTC/USD' });

      expect(marketDataSyncService.syncDailyData).toHaveBeenCalledWith(
        'BTC/USD',
      );
      expect(result.message).toContain('BTC/USD');
    });
  });

  describe('triggerPrePopulate', () => {
    it('should trigger pre-population for all symbols', async () => {
      marketDataSyncService.prePopulateHistoricalData.mockResolvedValue(
        undefined,
      );

      const result = await controller.triggerPrePopulate({});

      expect(
        marketDataSyncService.prePopulateHistoricalData,
      ).toHaveBeenCalledWith(undefined);
      expect(result.message).toContain('Historical data pre-population');
    });
  });

  describe('syncDateRange', () => {
    it('should sync date range', async () => {
      marketDataSyncService.syncDateRange.mockResolvedValue(undefined);

      const body = {
        symbol: 'BTC/USD',
        timeframe: '1d',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const result = await controller.syncDateRange(body);

      expect(marketDataSyncService.syncDateRange).toHaveBeenCalledWith(
        'BTC/USD',
        '1d',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
      expect(result.message).toContain('Date range sync completed');
    });
  });

  describe('fillGaps', () => {
    it('should fill gaps in data', async () => {
      marketDataSyncService.checkAndFillGaps.mockResolvedValue(undefined);

      const body = {
        symbol: 'BTC/USD',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const result = await controller.fillGaps(body);

      expect(marketDataSyncService.checkAndFillGaps).toHaveBeenCalledWith(
        'BTC/USD',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
      expect(result.message).toContain('Gap filling completed');
    });
  });

  describe('forceResync', () => {
    it('should force re-sync date range', async () => {
      marketDataSyncService.forceResyncDateRange.mockResolvedValue(undefined);

      const body = {
        symbol: 'BTC/USD',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const result = await controller.forceResync(body);

      expect(marketDataSyncService.forceResyncDateRange).toHaveBeenCalledWith(
        'BTC/USD',
        '1d',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
      expect(result.message).toContain('Force re-sync completed');
    });
  });
});
