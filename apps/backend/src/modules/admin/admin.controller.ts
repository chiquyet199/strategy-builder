import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { ComparisonTrackingService } from './services/comparison-tracking.service';
import { SharedComparisonAnalyticsService } from './services/shared-comparison-analytics.service';

@ApiTags('admin')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MASTER)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private readonly comparisonTrackingService: ComparisonTrackingService,
    private readonly sharedComparisonAnalyticsService: SharedComparisonAnalyticsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const timeRange =
      startDate && endDate
        ? {
            start: new Date(startDate),
            end: new Date(endDate),
          }
        : undefined;

    return this.comparisonTrackingService.getDashboardStats(timeRange);
  }

  @Get('popular-strategies')
  @ApiOperation({ summary: 'Get most popular strategies by usage count' })
  @ApiResponse({ status: 200, description: 'Popular strategies retrieved successfully' })
  async getPopularStrategies(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const timeRange =
      startDate && endDate
        ? {
            start: new Date(startDate),
            end: new Date(endDate),
          }
        : undefined;

    return this.comparisonTrackingService.getPopularStrategies(limit, timeRange);
  }

  @Get('top-performing')
  @ApiOperation({ summary: 'Get top performing strategies by return' })
  @ApiResponse({ status: 200, description: 'Top performing strategies retrieved successfully' })
  async getTopPerforming(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const timeRange =
      startDate && endDate
        ? {
            start: new Date(startDate),
            end: new Date(endDate),
          }
        : undefined;

    return this.comparisonTrackingService.getTopPerformingStrategies(limit, timeRange);
  }

  @Get('recent-comparisons')
  @ApiOperation({ summary: 'Get recent comparison runs' })
  @ApiResponse({ status: 200, description: 'Recent comparisons retrieved successfully' })
  async getRecentComparisons(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.comparisonTrackingService.getRecentComparisons(limit);
  }

  @Get('strategy/:strategyId')
  @ApiOperation({ summary: 'Get statistics for a specific strategy' })
  @ApiResponse({ status: 200, description: 'Strategy statistics retrieved successfully' })
  async getStrategyStats(
    @Param('strategyId') strategyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const timeRange =
      startDate && endDate
        ? {
            start: new Date(startDate),
            end: new Date(endDate),
          }
        : undefined;

    return this.comparisonTrackingService.getStrategyStats(strategyId, timeRange);
  }

  @Get('shared-comparisons')
  @ApiOperation({ summary: 'Get popular shared comparisons' })
  @ApiResponse({ status: 200, description: 'Popular shared comparisons retrieved successfully' })
  async getSharedComparisons(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.sharedComparisonAnalyticsService.getPopularShares(limit);
  }

  @Get('comparison-runs')
  @ApiOperation({ summary: 'Get paginated list of comparison runs' })
  @ApiResponse({ status: 200, description: 'Comparison runs retrieved successfully' })
  async getComparisonRuns(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const timeRange =
      startDate && endDate
        ? {
            start: new Date(startDate),
            end: new Date(endDate),
          }
        : undefined;

    return this.comparisonTrackingService.getComparisonRuns(page, limit, timeRange);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Manually trigger data cleanup (admin only)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  async cleanup(
    @Query('retentionDays', new DefaultValuePipe(365), ParseIntPipe)
    retentionDays: number,
  ) {
    const deletedCount =
      await this.comparisonTrackingService.cleanupOldData(retentionDays);
    return {
      message: `Cleaned up ${deletedCount} comparison runs`,
      deletedCount,
    };
  }
}

