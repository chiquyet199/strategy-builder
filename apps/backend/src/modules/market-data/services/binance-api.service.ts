import { Injectable, Logger } from '@nestjs/common';
import { Candlestick, Timeframe } from '../interfaces/candlestick.interface';
import { BinanceRateLimiter } from '../utils/rate-limiter';

interface BinanceKline {
  0: number; // Open time
  1: string; // Open
  2: string; // High
  3: string; // Low
  4: string; // Close
  5: string; // Volume
  6: number; // Close time
  7: string; // Quote asset volume
  8: number; // Number of trades
  9: string; // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Ignore
}

@Injectable()
export class BinanceApiService {
  private readonly logger = new Logger(BinanceApiService.name);
  private readonly BASE_URL = 'https://api.binance.com/api/v3';
  private readonly MAX_KLINES_PER_REQUEST = 1000;

  // Binance rate limits
  private readonly MAX_WEIGHT_PER_MINUTE = 1200;
  private readonly MAX_REQUESTS_PER_MINUTE = 1200;

  // Request weight for klines endpoint based on limit
  // limit ≤ 100: weight = 1
  // 100 < limit ≤ 500: weight = 2
  // 500 < limit ≤ 1000: weight = 5
  private readonly REQUEST_WEIGHT = 5; // We use limit=1000, so weight=5

  // Rate limiter instance
  private readonly rateLimiter: BinanceRateLimiter;

  constructor() {
    this.rateLimiter = new BinanceRateLimiter(
      this.logger,
      this.MAX_WEIGHT_PER_MINUTE,
      this.MAX_REQUESTS_PER_MINUTE,
      this.REQUEST_WEIGHT,
    );
  }

  /**
   * Map our timeframe to Binance interval
   */
  private getBinanceInterval(timeframe: Timeframe): string {
    const intervalMap: Record<Timeframe, string> = {
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w',
      '1m': '1M',
    };
    return intervalMap[timeframe];
  }

  /**
   * Convert Binance symbol format (BTCUSDT) to our format (BTC/USD)
   * Note: Binance uses USDT, we normalize to USD
   */
  normalizeSymbol(symbol: string): string {
    // Convert BTCUSDT -> BTC/USD
    if (symbol.endsWith('USDT')) {
      return symbol.replace('USDT', '/USD');
    }
    // If already in BTC/USD format, convert to BTCUSDT
    if (symbol.includes('/')) {
      return symbol.replace('/USD', 'USDT').replace('/', '');
    }
    return symbol;
  }

  /**
   * Convert our symbol format (BTC/USD) to Binance format (BTCUSDT)
   */
  toBinanceSymbol(symbol: string): string {
    if (symbol.includes('/')) {
      return symbol.replace('/USD', 'USDT').replace('/', '');
    }
    return symbol;
  }

  /**
   * Fetch klines from Binance API
   * Handles pagination automatically for large date ranges
   */
  async getKlines(
    symbol: string,
    timeframe: Timeframe,
    startTime: Date,
    endTime: Date,
  ): Promise<Candlestick[]> {
    const binanceSymbol = this.toBinanceSymbol(symbol);
    const interval = this.getBinanceInterval(timeframe);
    const allCandles: Candlestick[] = [];

    let currentStartTime = startTime.getTime();
    const endTimestamp = endTime.getTime();

    this.logger.log(
      `Fetching ${interval} klines for ${binanceSymbol} from ${startTime.toISOString()} to ${endTime.toISOString()}`,
    );

    try {
      while (currentStartTime < endTimestamp) {
        const batch = await this.fetchKlinesBatch(
          binanceSymbol,
          interval,
          currentStartTime,
          endTimestamp,
        );

        if (batch.length === 0) {
          break;
        }

        allCandles.push(...batch);

        // Move to next batch (use close time of last candle + 1ms)
        const lastCandle = batch[batch.length - 1];
        const lastCloseTime = new Date(lastCandle.timestamp).getTime();
        currentStartTime = lastCloseTime + 1;

        // If we got less than max, we've reached the end
        if (batch.length < this.MAX_KLINES_PER_REQUEST) {
          break;
        }

        // Rate limiting: Wait to respect weight and request limits
        await this.rateLimiter.waitForRateLimit();
      }

      this.logger.log(
        `Fetched ${allCandles.length} ${interval} klines for ${binanceSymbol}`,
      );

      return allCandles;
    } catch (error) {
      this.logger.error(
        `Error fetching klines from Binance: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Fetch a single batch of klines (up to 1000)
   */
  private async fetchKlinesBatch(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    retryCount: number = 0,
  ): Promise<Candlestick[]> {
    const url = new URL(`${this.BASE_URL}/klines`);
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('interval', interval);
    url.searchParams.append('startTime', startTime.toString());
    url.searchParams.append('endTime', endTime.toString());
    url.searchParams.append('limit', this.MAX_KLINES_PER_REQUEST.toString());

    // Wait before making request to respect rate limits
    await this.rateLimiter.waitForRateLimit();

    const response = await fetch(url.toString());

    // Track weight usage from response headers
    const weightHeader = response.headers.get('X-MBX-USED-WEIGHT-1M');
    this.rateLimiter.trackRequestFromHeader(weightHeader);

    if (!response.ok) {
      // Handle rate limit errors (429) with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.min(1000 * Math.pow(2, retryCount), 60000); // Max 60 seconds

        this.logger.warn(
          `Rate limit exceeded. Waiting ${waitTime}ms before retry (attempt ${retryCount + 1})`,
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // Retry up to 3 times
        if (retryCount < 3) {
          return this.fetchKlinesBatch(
            symbol,
            interval,
            startTime,
            endTime,
            retryCount + 1,
          );
        }

        throw new Error(
          `Rate limit exceeded after ${retryCount + 1} retries. Please try again later.`,
        );
      }

      const errorText = await response.text();
      throw new Error(`Binance API error (${response.status}): ${errorText}`);
    }

    const klines: BinanceKline[] = await response.json();

    return klines.map((kline) =>
      this.convertKlineToCandlestick(kline, interval as Timeframe),
    );
  }

  /**
   * Convert Binance kline format to our Candlestick format
   */
  private convertKlineToCandlestick(
    kline: BinanceKline,
    timeframe: Timeframe,
  ): Candlestick {
    return {
      timestamp: new Date(kline[0]).toISOString(),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      timeframe,
    };
  }

  /**
   * Check if Binance API is available
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/ping`);
      return response.ok;
    } catch (error) {
      this.logger.warn(`Binance API health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get server time from Binance (useful for syncing)
   */
  async getServerTime(): Promise<number> {
    const response = await fetch(`${this.BASE_URL}/time`);
    if (!response.ok) {
      throw new Error(
        `Failed to get Binance server time: ${response.statusText}`,
      );
    }
    const data = await response.json();
    return data.serverTime;
  }

}
