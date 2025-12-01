import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { MarketDataSyncService } from './services/market-data-sync.service';
import { MarketDataSyncJob } from './jobs/market-data-sync.job';
import { BinanceApiService } from './services/binance-api.service';
import { Candlestick } from './entities/candlestick.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Candlestick])],
  controllers: [MarketDataController],
  providers: [
    MarketDataService,
    MarketDataSyncService,
    MarketDataSyncJob,
    BinanceApiService,
  ],
  exports: [MarketDataService, MarketDataSyncService],
})
export class MarketDataModule implements OnModuleInit {
  private readonly logger = new Logger(MarketDataModule.name);

  constructor(private readonly marketDataSyncService: MarketDataSyncService) {}

  async onModuleInit() {
    // Check if we should pre-populate historical data
    const shouldPrePopulate = process.env.MARKET_DATA_PREPOPULATE !== 'false';

    if (shouldPrePopulate) {
      this.logger.log(
        'Checking if historical market data needs to be pre-populated...',
      );

      // Run in background to avoid blocking application startup
      setImmediate(async () => {
        try {
          // Pre-populate all supported symbols
          await this.marketDataSyncService.prePopulateHistoricalData();
          this.logger.log('Historical market data pre-population completed');
        } catch (error) {
          this.logger.error(
            `Error pre-populating historical market data: ${error.message}`,
            error.stack,
          );
        }
      });
    } else {
      this.logger.log(
        'Market data pre-population is disabled (MARKET_DATA_PREPOPULATE=false)',
      );
    }
  }
}
