import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candlestick } from '../entities/candlestick.entity';
import { BinanceApiService } from './binance-api.service';
import { Timeframe } from '../interfaces/candlestick.interface';
import { MarketDataException } from '../../../common/exceptions/market-data.exception';
import { parseSupportedSymbolsFromEnv, calculateGapRanges } from '../utils/sync-helpers';

@Injectable()
export class MarketDataSyncService {
  private readonly logger = new Logger(MarketDataSyncService.name);
  private readonly BATCH_SIZE = parseInt(
    process.env.MARKET_DATA_BATCH_SIZE || '1000',
    10,
  );

  private readonly supportedSymbols: string[] = parseSupportedSymbolsFromEnv(
    process.env.SUPPORTED_SYMBOLS,
    'BTC/USD',
  );

  constructor(
    @InjectRepository(Candlestick)
    private readonly candlestickRepository: Repository<Candlestick>,
    private readonly binanceApiService: BinanceApiService,
  ) {}

  /**
   * Pre-populate historical data for all supported symbols
   * This is called on first startup to ensure data is available
   */
  async prePopulateHistoricalData(symbol?: string): Promise<void> {
    const symbolsToSync = symbol ? [symbol] : this.supportedSymbols;

    for (const sym of symbolsToSync) {
      await this.prePopulateSymbol(sym);

      // Add delay between symbols to avoid rate limits
      // BinanceApiService handles per-request rate limiting,
      // but we add extra delay here for safety when syncing multiple symbols
      if (symbolsToSync.length > 1) {
        await this.delay(1000); // 1 second between symbols
      }
    }
  }

  /**
   * Pre-populate historical data for a single symbol (all timeframes)
   */
  private async prePopulateSymbol(symbol: string): Promise<void> {
    this.logger.log(
      `Starting pre-population of historical data for ${symbol} from Binance API (all timeframes)`,
    );

    const startDate = new Date('2020-01-01');
    const endDate = new Date('2025-12-31');
    const timeframes: Timeframe[] = ['1h', '4h', '1d', '1w', '1m'];

    // Check if any data already exists for this symbol (check all timeframes)
    const existingCounts = await Promise.all(
      timeframes.map((tf) =>
        this.candlestickRepository.count({
          where: { symbol, timeframe: tf },
        }),
      ),
    );
    const totalExisting = existingCounts.reduce((sum, count) => sum + count, 0);

    if (totalExisting > 0) {
      this.logger.log(
        `Historical data already exists for ${symbol} (${totalExisting} total records across all timeframes). Checking for gaps...`,
      );
      this.logger.warn(
        `Note: Existing data will NOT be overwritten. To force re-sync with Binance, delete existing data first or use admin endpoint.`,
      );
      await this.checkAndFillGaps(symbol, startDate, endDate);
      return;
    }

    // Sync all timeframes
    for (const timeframe of timeframes) {
      this.logger.log(`Syncing ${timeframe} data for ${symbol}...`);
      await this.syncDateRange(symbol, timeframe, startDate, endDate);

      // Add delay between timeframes to avoid rate limits
      if (timeframes.indexOf(timeframe) < timeframes.length - 1) {
        await this.delay(1000); // 1 second between timeframes
      }
    }

    this.logger.log(
      `Completed pre-population of historical data for ${symbol} (all timeframes)`,
    );
  }

  /**
   * Sync today's data for all supported symbols
   */
  async syncDailyData(symbol?: string): Promise<void> {
    const symbolsToSync = symbol ? [symbol] : this.supportedSymbols;

    for (const sym of symbolsToSync) {
      await this.syncDailyDataForSymbol(sym);

      // Add delay between symbols to avoid rate limits
      if (symbolsToSync.length > 1) {
        await this.delay(500); // 500ms between symbols for daily sync
      }
    }
  }

  /**
   * Sync today's data for a single symbol (all timeframes)
   */
  private async syncDailyDataForSymbol(symbol: string): Promise<void> {
    this.logger.log(`Syncing daily data for ${symbol} (all timeframes)`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const now = new Date();

    const timeframes: Timeframe[] = ['1h', '4h', '1d', '1w', '1m'];

    // Sync all timeframes for today
    for (const timeframe of timeframes) {
      // For hourly/4h, we need to sync up to now, not just today
      // For daily/weekly/monthly, we sync today
      const endDate = ['1h', '4h'].includes(timeframe)
        ? now // Current time for intraday timeframes
        : tomorrow; // End of today for daily+ timeframes

      // For intraday timeframes, always sync (they update frequently)
      // For daily/weekly/monthly, check if today's data exists
      if (!['1h', '4h'].includes(timeframe)) {
        const existing = await this.candlestickRepository.findOne({
          where: {
            symbol,
            timeframe,
            timestamp: today,
          },
        });

        if (existing) {
          this.logger.log(
            `Today's ${timeframe} data already exists for ${symbol}`,
          );
          continue;
        }
      }

      // Sync the timeframe
      await this.syncDateRange(symbol, timeframe, today, endDate);

      // Add delay between timeframes
      if (timeframes.indexOf(timeframe) < timeframes.length - 1) {
        await this.delay(500); // 500ms between timeframes
      }
    }

    this.logger.log(
      `Completed syncing daily data for ${symbol} (all timeframes)`,
    );
  }

  /**
   * Get list of supported symbols
   * Format: BTC/USD,ETH/USD,BNB/USD (comma-separated)
   * Default: BTC/USD
   */
  getSupportedSymbols(): string[] {
    return [...this.supportedSymbols];
  }


  /**
   * Sync data for a specific date range and timeframe
   */
  async syncDateRange(
    symbol: string,
    timeframe: Timeframe,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    this.logger.log(
      `Syncing ${timeframe} data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()} from Binance API`,
    );

    // Check if Binance API is available
    const isHealthy = await this.binanceApiService.checkApiHealth();
    if (!isHealthy) {
      throw new MarketDataException(
        'Binance API is not available. Please check your connection and API configuration.',
      );
    }

    // Fetch from Binance
    const candlesToStore = await this.binanceApiService.getKlines(
      symbol,
      timeframe,
      startDate,
      endDate,
    );

    this.logger.log(
      `Fetched ${candlesToStore.length} candles from Binance API`,
    );

    // Convert to entity format and batch insert
    const entities: Candlestick[] = candlesToStore.map((candle) => {
      const entity = this.candlestickRepository.create({
        symbol,
        timestamp: new Date(candle.timestamp),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        timeframe,
      });
      return entity;
    });

    // Batch insert with conflict handling (upsert)
    await this.batchUpsert(entities);

    this.logger.log(
      `Synced ${entities.length} ${timeframe} candles for ${symbol} from Binance API`,
    );
  }

  /**
   * Force re-sync data range (overwrites existing data)
   */
  async forceResyncDateRange(
    symbol: string,
    timeframe: Timeframe,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    this.logger.log(
      `Force re-syncing ${timeframe} data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    // Delete existing data for this symbol/timeframe/date range first
    await this.candlestickRepository
      .createQueryBuilder()
      .delete()
      .from(Candlestick)
      .where('symbol = :symbol', { symbol })
      .andWhere('timeframe = :timeframe', { timeframe })
      .andWhere('timestamp >= :startDate', { startDate })
      .andWhere('timestamp <= :endDate', { endDate })
      .execute();

    this.logger.log(
      `Deleted existing data for ${symbol} ${timeframe} in date range`,
    );

    // Now sync fresh data
    await this.syncDateRange(symbol, timeframe, startDate, endDate);
  }

  /**
   * Check for gaps in data and fill them (all timeframes)
   */
  async checkAndFillGaps(
    symbol: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    this.logger.log(
      `Checking for gaps in ${symbol} data from ${startDate.toISOString()} to ${endDate.toISOString()} (all timeframes)`,
    );

    const timeframes: Timeframe[] = ['1h', '4h', '1d', '1w', '1m'];

    for (const timeframe of timeframes) {
      this.logger.log(`Checking gaps for ${timeframe}...`);

      // Get all existing timestamps for this timeframe
      const existingCandles = await this.candlestickRepository.find({
        where: {
          symbol,
          timeframe,
        },
        select: ['timestamp'],
        order: {
          timestamp: 'ASC',
        },
      });

      if (existingCandles.length === 0) {
        // No data exists, sync the entire range
        this.logger.log(
          `No ${timeframe} data exists for ${symbol}, syncing full range...`,
        );
        await this.syncDateRange(symbol, timeframe, startDate, endDate);
        continue;
      }

      // Use pure function to calculate gap ranges
      const timestamps = existingCandles.map((c) => c.timestamp);
      const gaps = calculateGapRanges(timestamps, startDate, endDate);

      // Sync each gap
      for (const gap of gaps) {
        this.logger.log(
          `Gap found: missing ${timeframe} data from ${gap.start.toISOString()} to ${gap.end.toISOString()}`,
        );
        await this.syncDateRange(symbol, timeframe, gap.start, gap.end);
      }

      // Add delay between timeframes
      if (timeframes.indexOf(timeframe) < timeframes.length - 1) {
        await this.delay(500);
      }
    }

    this.logger.log(`Completed filling gaps for ${symbol} (all timeframes)`);
  }

  /**
   * Batch upsert entities (insert or update on conflict)
   * Uses PostgreSQL's ON CONFLICT DO UPDATE for updating existing records
   */
  private async batchUpsert(entities: Candlestick[]): Promise<void> {
    if (entities.length === 0) {
      return;
    }

    // Process in batches
    for (let i = 0; i < entities.length; i += this.BATCH_SIZE) {
      const batch = entities.slice(i, i + this.BATCH_SIZE);

      try {
        // Use query builder for efficient batch insert with conflict handling
        // ON CONFLICT DO UPDATE to overwrite existing data with new values
        const queryBuilder = this.candlestickRepository
          .createQueryBuilder()
          .insert()
          .into(Candlestick)
          .values(batch);

        // Use raw SQL for ON CONFLICT DO UPDATE (TypeORM doesn't have direct orUpdate support)
        // This will update existing records with new values
        await queryBuilder
          .orUpdate(
            ['open', 'high', 'low', 'close', 'volume', 'updatedAt'],
            ['symbol', 'timeframe', 'timestamp'],
          )
          .execute();

        this.logger.debug(`Upserted batch of ${batch.length} candles`);
      } catch (error) {
        this.logger.error(
          `Error upserting batch: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }
  }

  /**
   * Get sync status - count of candles by symbol and timeframe
   */
  async getSyncStatus(symbol: string = 'BTC/USD'): Promise<{
    symbol: string;
    timeframes: Record<Timeframe, number>;
    earliestDate: Date | null;
    latestDate: Date | null;
  }> {
    const timeframes: Timeframe[] = ['1h', '4h', '1d', '1w', '1m'];
    const timeframeCounts: Record<Timeframe, number> = {
      '1h': 0,
      '4h': 0,
      '1d': 0,
      '1w': 0,
      '1m': 0,
    };

    for (const tf of timeframes) {
      const count = await this.candlestickRepository.count({
        where: { symbol, timeframe: tf },
      });
      timeframeCounts[tf] = count;
    }

    // Get date range
    const earliest = await this.candlestickRepository.findOne({
      where: { symbol, timeframe: '1d' },
      order: { timestamp: 'ASC' },
      select: ['timestamp'],
    });

    const latest = await this.candlestickRepository.findOne({
      where: { symbol, timeframe: '1d' },
      order: { timestamp: 'DESC' },
      select: ['timestamp'],
    });

    return {
      symbol,
      timeframes: timeframeCounts,
      earliestDate: earliest?.timestamp || null,
      latestDate: latest?.timestamp || null,
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
