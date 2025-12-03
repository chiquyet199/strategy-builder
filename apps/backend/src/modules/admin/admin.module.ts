import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { ComparisonTrackingService } from './services/comparison-tracking.service';
import { SharedComparisonAnalyticsService } from './services/shared-comparison-analytics.service';
import { DataCleanupJob } from './jobs/data-cleanup.job';
import { ComparisonRun } from './entities/comparison-run.entity';
import { SharedComparison } from '../backtest/entities/shared-comparison.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ComparisonRun, SharedComparison]),
  ],
  controllers: [AdminController],
  providers: [
    ComparisonTrackingService,
    SharedComparisonAnalyticsService,
    DataCleanupJob,
  ],
  exports: [
    ComparisonTrackingService,
    SharedComparisonAnalyticsService,
  ],
})
export class AdminModule {}

