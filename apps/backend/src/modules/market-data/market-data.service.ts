import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Candlestick } from './entities/candlestick.entity';
import {
  Candlestick as CandlestickInterface,
  Timeframe,
} from './interfaces/candlestick.interface';
import { CandleAggregator } from './utils/candle-aggregator';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    @InjectRepository(Candlestick)
    private readonly candlestickRepository: Repository<Candlestick>,
  ) {}

  /**
   * Get candlestick data for a symbol, timeframe, and date range
   * Queries from database only - data must be synced via admin endpoints
   */
  async getCandles(
    symbol: string,
    timeframe: Timeframe,
    startDate: string,
    endDate: string,
  ): Promise<CandlestickInterface[]> {
    this.logger.log(
      `Fetching candles for ${symbol}, timeframe: ${timeframe}, from ${startDate} to ${endDate}`,
    );

    // Validate symbol is supported
    const supportedSymbols = this.getSupportedSymbols();
    if (!supportedSymbols.includes(symbol)) {
      throw new Error(
        `Symbol ${symbol} is not supported. Supported symbols: ${supportedSymbols.join(', ')}`,
      );
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

    // Get data from database
    const candles = await this.getCandlesFromDatabase(
      symbol,
      timeframe,
      start,
      end,
    );

    if (candles.length === 0) {
      this.logger.warn(
        `No data found in database for ${symbol} ${timeframe} from ${startDate} to ${endDate}. Please sync data using admin endpoints.`,
      );
      throw new Error(
        `No market data available for ${symbol} in the requested date range. Please sync data first using admin endpoints.`,
      );
    }

    this.logger.debug(`Retrieved ${candles.length} candles from database`);
    return candles;
  }

  /**
   * Get candles from database
   */
  private async getCandlesFromDatabase(
    symbol: string,
    timeframe: Timeframe,
    startDate: Date,
    endDate: Date,
  ): Promise<CandlestickInterface[]> {
    // For daily timeframe, query directly
    if (timeframe === '1d') {
      const entities = await this.candlestickRepository.find({
        where: {
          symbol,
          timeframe,
          timestamp: Between(startDate, endDate),
        },
        order: {
          timestamp: 'ASC',
        },
      });

      return this.convertEntitiesToInterface(entities);
    }

    // For other timeframes, query daily data and aggregate
    const dailyEntities = await this.candlestickRepository.find({
      where: {
        symbol,
        timeframe: '1d',
        timestamp: Between(startDate, endDate),
      },
      order: {
        timestamp: 'ASC',
      },
    });

    if (dailyEntities.length === 0) {
      return [];
    }

    // Convert to interface format
    const dailyCandles = this.convertEntitiesToInterface(dailyEntities);

    // Aggregate to requested timeframe
    return CandleAggregator.aggregateCandles(dailyCandles, timeframe);
  }

  /**
   * Convert database entities to interface format
   */
  private convertEntitiesToInterface(
    entities: Candlestick[],
  ): CandlestickInterface[] {
    return entities.map((entity) => ({
      timestamp: entity.timestamp.toISOString(),
      open: Number(entity.open),
      high: Number(entity.high),
      low: Number(entity.low),
      close: Number(entity.close),
      volume: Number(entity.volume),
      timeframe: entity.timeframe,
    }));
  }

  /**
   * Get supported symbols from environment variable
   */
  private getSupportedSymbols(): string[] {
    const symbolsEnv = process.env.SUPPORTED_SYMBOLS || 'BTC/USD';
    return symbolsEnv.split(',').map((s) => s.trim());
  }
}
