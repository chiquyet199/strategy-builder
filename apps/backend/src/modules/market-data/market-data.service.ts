import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Candlestick } from './entities/candlestick.entity';
import {
  Candlestick as CandlestickInterface,
  Timeframe,
} from './interfaces/candlestick.interface';
import { MarketDataException } from '../../common/exceptions/market-data.exception';
import {
  validateSymbol,
  validateDateRange,
  parseSupportedSymbols,
} from './utils/market-data-validators';
import { convertEntitiesToInterface } from './utils/entity-converter';

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
    try {
      validateSymbol(symbol, supportedSymbols);
    } catch (error) {
      throw new MarketDataException(error.message);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date range
    const maxDate = new Date('2025-12-31');
    try {
      validateDateRange(start, end, maxDate);
    } catch (error) {
      throw new MarketDataException(error.message);
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
      throw new MarketDataException(
        `No market data available for ${symbol} in the requested date range. Please sync data first using admin endpoints.`,
      );
    }

    this.logger.debug(`Retrieved ${candles.length} candles from database`);
    return candles;
  }

  /**
   * Get candles from database
   * Now queries directly for all timeframes (no aggregation needed)
   */
  private async getCandlesFromDatabase(
    symbol: string,
    timeframe: Timeframe,
    startDate: Date,
    endDate: Date,
  ): Promise<CandlestickInterface[]> {
    // Query directly for the requested timeframe
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

    return convertEntitiesToInterface(entities);
  }

  /**
   * Get supported symbols from environment variable
   */
  private getSupportedSymbols(): string[] {
    return parseSupportedSymbols(process.env.SUPPORTED_SYMBOLS, 'BTC/USD');
  }
}
