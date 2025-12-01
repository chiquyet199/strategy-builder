import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MarketDataSyncService } from '../services/market-data-sync.service';

@Injectable()
export class MarketDataSyncJob {
  private readonly logger = new Logger(MarketDataSyncJob.name);

  constructor(private readonly marketDataSyncService: MarketDataSyncService) {}

  /**
   * Daily cron job to sync market data
   * Runs at midnight by default, configurable via MARKET_DATA_SYNC_CRON env var
   */
  @Cron(
    process.env.MARKET_DATA_SYNC_CRON || CronExpression.EVERY_DAY_AT_MIDNIGHT,
  )
  async handleDailySync() {
    this.logger.log('Starting scheduled daily market data sync');

    try {
      // Sync all supported symbols
      await this.marketDataSyncService.syncDailyData();
      this.logger.log('Completed scheduled daily market data sync');
    } catch (error) {
      this.logger.error(
        `Error in scheduled daily market data sync: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow job to complete and retry next day
    }
  }
}
