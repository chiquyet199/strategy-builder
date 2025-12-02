import { Test, TestingModule } from '@nestjs/testing';
import { BinanceApiService } from './binance-api.service';
import { Timeframe } from '../interfaces/candlestick.interface';

// Mock global fetch
global.fetch = jest.fn();

describe('BinanceApiService', () => {
  let service: BinanceApiService;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BinanceApiService],
    }).compile();

    service = module.get<BinanceApiService>(BinanceApiService);
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  describe('toBinanceSymbol', () => {
    it('should convert BTC/USD to BTCUSDT', () => {
      expect(service.toBinanceSymbol('BTC/USD')).toBe('BTCUSDT');
    });

    it('should convert ETH/USD to ETHUSDT', () => {
      expect(service.toBinanceSymbol('ETH/USD')).toBe('ETHUSDT');
    });

    it('should return symbol as-is if already in Binance format', () => {
      expect(service.toBinanceSymbol('BTCUSDT')).toBe('BTCUSDT');
    });
  });

  describe('normalizeSymbol', () => {
    it('should convert BTCUSDT to BTC/USD', () => {
      expect(service.normalizeSymbol('BTCUSDT')).toBe('BTC/USD');
    });

    it('should convert BTC/USD to BTCUSDT', () => {
      expect(service.normalizeSymbol('BTC/USD')).toBe('BTCUSDT');
    });

    it('should return symbol as-is if format is unknown', () => {
      expect(service.normalizeSymbol('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('checkApiHealth', () => {
    it('should return true if API is healthy', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const result = await service.checkApiHealth();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.binance.com/api/v3/ping',
      );
    });

    it('should return false if API is not healthy', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await service.checkApiHealth();

      expect(result).toBe(false);
    });

    it('should return false if fetch throws error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.checkApiHealth();

      expect(result).toBe(false);
    });
  });

  describe('getServerTime', () => {
    it('should return server time from Binance', async () => {
      const mockServerTime = Date.now();
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ serverTime: mockServerTime }),
      } as unknown as Response);

      const result = await service.getServerTime();

      expect(result).toBe(mockServerTime);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.binance.com/api/v3/time',
      );
    });

    it('should throw error if API request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(service.getServerTime()).rejects.toThrow(
        'Failed to get Binance server time',
      );
    });
  });

  describe('getKlines', () => {
    const symbol = 'BTC/USD';
    const timeframe: Timeframe = '1d';
    const startTime = new Date('2024-01-01');
    const endTime = new Date('2024-01-02');

    const mockBinanceKline = [
      1704067200000, // Open time
      '7200.5', // Open
      '7350.2', // High
      '7100.1', // Low
      '7280.3', // Close
      '500000', // Volume
      1704153599999, // Close time
      '364000000', // Quote asset volume
      1000, // Number of trades
      '250000', // Taker buy base asset volume
      '182000000', // Taker buy quote asset volume
      '0', // Ignore
    ];

    it('should successfully fetch klines and convert to Candlestick format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-MBX-USED-WEIGHT-1M': '5',
        }),
        json: jest.fn().mockResolvedValue([mockBinanceKline]),
      } as unknown as Response);

      const promise = service.getKlines(symbol, timeframe, startTime, endTime);

      // Advance timers to handle rate limiting delays
      while (jest.getTimerCount() > 0) {
        jest.advanceTimersByTime(250);
        await Promise.resolve(); // Allow promises to resolve
      }

      const result = await promise;

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        timestamp: new Date(1704067200000).toISOString(),
        open: 7200.5,
        high: 7350.2,
        low: 7100.1,
        close: 7280.3,
        volume: 500000,
        timeframe: '1d',
      });
    });

    it('should handle pagination for large date ranges', async () => {
      const firstBatch = Array(1000).fill(mockBinanceKline);
      const secondBatch = [mockBinanceKline];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({
            'X-MBX-USED-WEIGHT-1M': '5',
          }),
          json: jest.fn().mockResolvedValue(firstBatch),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({
            'X-MBX-USED-WEIGHT-1M': '10',
          }),
          json: jest.fn().mockResolvedValue(secondBatch),
        } as unknown as Response);

      const promise = service.getKlines(symbol, timeframe, startTime, endTime);

      // Run all pending timers
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result).toHaveLength(1001);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limit errors with retry', async () => {
      const retryAfter = '1';
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({
            'Retry-After': retryAfter,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({
            'X-MBX-USED-WEIGHT-1M': '5',
          }),
          json: jest.fn().mockResolvedValue([mockBinanceKline]),
        } as unknown as Response);

      const promise = service.getKlines(symbol, timeframe, startTime, endTime);

      // Run all pending timers (rate limiting + retry delays)
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries for rate limit', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({
          'Retry-After': '1',
        }),
      } as Response);

      const promise = service.getKlines(symbol, timeframe, startTime, endTime);

      // Run all pending timers (rate limiting + retry delays)
      while (jest.getTimerCount() > 0) {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      }

      await expect(promise).rejects.toThrow(
        /Rate limit exceeded after \d+ retries/,
      );

      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 10000);

    it('should throw error for non-429 API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        text: jest.fn().mockResolvedValue('Invalid symbol'),
      } as unknown as Response);

      const promise = service.getKlines(symbol, timeframe, startTime, endTime);

      // Run all pending timers (rate limiting delay)
      while (jest.getTimerCount() > 0) {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
      }

      await expect(promise).rejects.toThrow(/Binance API error/);
    }, 10000);

    it('should handle different timeframes correctly', async () => {
      const timeframes: Timeframe[] = ['1h', '4h', '1d', '1w', '1m'];
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-MBX-USED-WEIGHT-1M': '5',
        }),
        json: jest.fn().mockResolvedValue([mockBinanceKline]),
      } as unknown as Response);

      for (const tf of timeframes) {
        const promise = service.getKlines(symbol, tf, startTime, endTime);

        // Run all pending timers (rate limiting delay)
        await jest.runAllTimersAsync();

        await promise;
        const callUrl = mockFetch.mock.calls[
          mockFetch.mock.calls.length - 1
        ][0] as string;
        const url = new URL(callUrl);
        expect(url.searchParams.get('interval')).toBe(tf === '1m' ? '1M' : tf);
      }
    });

    it('should stop pagination when batch is smaller than max', async () => {
      const smallBatch = [mockBinanceKline];
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-MBX-USED-WEIGHT-1M': '5',
        }),
        json: jest.fn().mockResolvedValue(smallBatch),
      } as unknown as Response);

      const promise = service.getKlines(symbol, timeframe, startTime, endTime);

      // Run all pending timers (rate limiting delay)
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should stop pagination when batch is empty', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-MBX-USED-WEIGHT-1M': '5',
        }),
        json: jest.fn().mockResolvedValue([]),
      } as unknown as Response);

      const promise = service.getKlines(symbol, timeframe, startTime, endTime);

      // Run all pending timers (rate limiting delay)
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
