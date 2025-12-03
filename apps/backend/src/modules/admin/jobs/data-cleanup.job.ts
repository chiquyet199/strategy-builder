import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ComparisonTrackingService } from '../services/comparison-tracking.service';

@Injectable()
export class DataCleanupJob {
  private readonly logger = new Logger(DataCleanupJob.name);
  private readonly retentionDays: number;

  constructor(
    private readonly comparisonTrackingService: ComparisonTrackingService,
  ) {
    // Get retention period from environment variable, default to 365 days
    this.retentionDays = parseInt(
      process.env.ANALYTICS_RETENTION_DAYS || '365',
      10,
    );
  }

  /**
   * Run cleanup job daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanup() {
    this.logger.log(
      `Starting data cleanup job (retention: ${this.retentionDays} days)`,
    );

    try {
      const deletedCount =
        await this.comparisonTrackingService.cleanupOldData(
          this.retentionDays,
        );

      this.logger.log(
        `Data cleanup completed. Deleted ${deletedCount} comparison runs.`,
      );
    } catch (error) {
      this.logger.error(
        `Data cleanup job failed: ${error.message}`,
        error.stack,
      );
    }
  }
}

