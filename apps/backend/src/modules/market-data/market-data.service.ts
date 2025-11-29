import { Injectable, Logger } from '@nestjs/common';
import { Candlestick, Timeframe } from './interfaces/candlestick.interface';
import { MockDataGenerator } from './services/mock-data-generator';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  /**
   * Get candlestick data for a symbol, timeframe, and date range
   * Currently returns mock data, but structure supports real API integration
   */
  async getCandles(
    symbol: string,
    timeframe: Timeframe,
    startDate: string,
    endDate: string,
  ): Promise<Candlestick[]> {
    this.logger.log(
      `Fetching candles for ${symbol}, timeframe: ${timeframe}, from ${startDate} to ${endDate}`,
    );

    // For MVP, only BTC/USD is supported
    // TODO: Extend to support multiple symbols (ETH/USD, etc.)
    if (symbol !== 'BTC/USD') {
      throw new Error(`Symbol ${symbol} is not supported. Only BTC/USD is available in MVP.`);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date range
    if (start > end) {
      throw new Error('Start date must be before end date');
    }

    // Validate date range (not too far in the future)
    const maxDate = new Date('2025-12-31');
    if (end > maxDate) {
      throw new Error('End date cannot be beyond 2025-12-31');
    }

    // Generate daily candles first (most granular for our mock data)
    const dailyCandles = MockDataGenerator.generateCandles(
      start,
      end,
      '1d',
    );

    // If timeframe is daily, return as is
    if (timeframe === '1d') {
      return dailyCandles;
    }

    // Otherwise, aggregate to requested timeframe
    return MockDataGenerator.aggregateCandles(dailyCandles, timeframe);
  }
}

