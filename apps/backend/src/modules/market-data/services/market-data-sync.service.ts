import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candlestick } from '../entities/candlestick.entity';
import { BinanceApiService } from './binance-api.service';
import { Timeframe } from '../interfaces/candlestick.interface';

@Injectable()
export class MarketDataSyncService {
  private readonly logger = new Logger(MarketDataSyncService.name);
  private readonly BATCH_SIZE = parseInt(
    process.env.MARKET_DATA_BATCH_SIZE || '1000',
    10,
  );

  private readonly supportedSymbols: string[] =
    this.getSupportedSymbolsFromEnv();

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
   * Pre-populate historical data for a single symbol
   */
  private async prePopulateSymbol(symbol: string): Promise<void> {
    this.logger.log(
      `Starting pre-population of historical data for ${symbol} from Binance API`,
    );

    const startDate = new Date('2020-01-01');
    const endDate = new Date('2025-12-31');

    // Check if any data already exists for this symbol
    const existingCount = await this.candlestickRepository.count({
      where: {
        symbol,
        timeframe: '1d',
      },
    });

    if (existingCount > 0) {
      this.logger.log(
        `Historical data already exists for ${symbol} (${existingCount} records). Checking for gaps...`,
      );
      this.logger.warn(
        `Note: Existing data will NOT be overwritten. To force re-sync with Binance, delete existing data first or use admin endpoint.`,
      );
      await this.checkAndFillGaps(symbol, startDate, endDate);
      return;
    }

    await this.syncDateRange(symbol, '1d', startDate, endDate);
    this.logger.log(
      `Completed pre-population of historical data for ${symbol}`,
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
   * Sync today's data for a single symbol
   */
  private async syncDailyDataForSymbol(symbol: string): Promise<void> {
    this.logger.log(`Syncing daily data for ${symbol}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today's data already exists
    const existing = await this.candlestickRepository.findOne({
      where: {
        symbol,
        timeframe: '1d',
        timestamp: today,
      },
    });

    if (existing) {
      this.logger.log(`Today's data already exists for ${symbol}`);
      return;
    }

    await this.syncDateRange(symbol, '1d', today, today);
    this.logger.log(`Completed syncing daily data for ${symbol}`);
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
   * Get supported symbols from environment variable (private helper)
   */
  private getSupportedSymbolsFromEnv(): string[] {
    const symbolsEnv = process.env.SUPPORTED_SYMBOLS || 'BTC/USD';
    return symbolsEnv.split(',').map((s) => s.trim());
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
      throw new Error(
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
   * Check for gaps in data and fill them
   */
  async checkAndFillGaps(
    symbol: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    this.logger.log(
      `Checking for gaps in ${symbol} data from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    // Get all existing timestamps for daily timeframe
    const existingCandles = await this.candlestickRepository.find({
      where: {
        symbol,
        timeframe: '1d',
      },
      select: ['timestamp'],
      order: {
        timestamp: 'ASC',
      },
    });

    const existingTimestamps = new Set(
      existingCandles.map((c) => c.timestamp.toISOString().split('T')[0]),
    );

    // Find missing dates
    const missingDates: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      if (!existingTimestamps.has(dateKey)) {
        missingDates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (missingDates.length === 0) {
      this.logger.log(`No gaps found in ${symbol} data`);
      return;
    }

    this.logger.log(
      `Found ${missingDates.length} missing dates. Filling gaps...`,
    );

    // Fill gaps in batches
    for (let i = 0; i < missingDates.length; i += this.BATCH_SIZE) {
      const batch = missingDates.slice(i, i + this.BATCH_SIZE);
      const batchStart = batch[0];
      const batchEnd = batch[batch.length - 1];

      await this.syncDateRange(symbol, '1d', batchStart, batchEnd);
    }

    this.logger.log(`Completed filling gaps for ${symbol}`);
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
