import { Controller, Get, Query, Post, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MarketDataService } from './market-data.service';
import { MarketDataSyncService } from './services/market-data-sync.service';
import { GetCandlesDto } from './dto/get-candles.dto';
import { Candlestick } from './interfaces/candlestick.interface';
import { Public } from '../../modules/auth/guards/public.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import { UserRole } from '../../modules/auth/entities/user.entity';

@ApiTags('market-data')
@Controller('market-data')
export class MarketDataController {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly marketDataSyncService: MarketDataSyncService,
  ) {}

  @Public()
  @Get('candles')
  @ApiOperation({ summary: 'Get candlestick data for a symbol' })
  @ApiResponse({
    status: 200,
    description: 'Candlestick data retrieved successfully',
    schema: {
      example: [
        {
          timestamp: '2020-01-01T00:00:00.000Z',
          open: 7200.5,
          high: 7350.2,
          low: 7100.1,
          close: 7280.3,
          volume: 500000,
          timeframe: '1d',
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  async getCandles(@Query() query: GetCandlesDto): Promise<Candlestick[]> {
    return this.marketDataService.getCandles(
      query.symbol || 'BTC/USD',
      query.timeframe || '1d',
      query.startDate,
      query.endDate,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MASTER)
  @Get('admin/sync-status')
  @ApiOperation({ summary: 'Get market data sync status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Sync status retrieved successfully',
  })
  async getSyncStatus(@Query('symbol') symbol?: string) {
    const symbolToCheck = symbol || 'BTC/USD';
    const status =
      await this.marketDataSyncService.getSyncStatus(symbolToCheck);
    return {
      ...status,
      supportedSymbols: this.marketDataSyncService.getSupportedSymbols(),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MASTER)
  @Post('admin/sync/daily')
  @ApiOperation({ summary: 'Manually trigger daily sync (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Daily sync triggered successfully',
  })
  async triggerDailySync(@Body() body?: { symbol?: string }) {
    await this.marketDataSyncService.syncDailyData(body?.symbol);
    return {
      message: body?.symbol
        ? `Daily sync completed for ${body.symbol}`
        : 'Daily sync completed for all supported symbols',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MASTER)
  @Post('admin/sync/prepopulate')
  @ApiOperation({
    summary: 'Manually trigger historical data pre-population (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pre-population triggered successfully',
  })
  async triggerPrePopulate(@Body() body?: { symbol?: string }) {
    await this.marketDataSyncService.prePopulateHistoricalData(body?.symbol);
    return {
      message: body?.symbol
        ? `Historical data pre-population completed for ${body.symbol}`
        : 'Historical data pre-population completed for all supported symbols',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MASTER)
  @Post('admin/sync/date-range')
  @ApiOperation({
    summary: 'Sync data for a specific date range (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Date range sync completed successfully',
  })
  async syncDateRange(
    @Body()
    body: {
      symbol?: string;
      timeframe?: string;
      startDate: string;
      endDate: string;
    },
  ) {
    const symbol = body.symbol || 'BTC/USD';
    const timeframe = (body.timeframe || '1d') as any;
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    await this.marketDataSyncService.syncDateRange(
      symbol,
      timeframe,
      startDate,
      endDate,
    );
    return {
      message: `Date range sync completed for ${symbol} ${timeframe} from ${body.startDate} to ${body.endDate}`,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MASTER)
  @Post('admin/sync/fill-gaps')
  @ApiOperation({
    summary: 'Check and fill gaps in market data (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Gap filling completed successfully',
  })
  async fillGaps(
    @Body()
    body: {
      symbol?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const symbol = body.symbol || 'BTC/USD';
    const startDate = body.startDate
      ? new Date(body.startDate)
      : new Date('2020-01-01');
    const endDate = body.endDate
      ? new Date(body.endDate)
      : new Date('2025-12-31');

    await this.marketDataSyncService.checkAndFillGaps(
      symbol,
      startDate,
      endDate,
    );
    return {
      message: `Gap filling completed for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MASTER)
  @Post('admin/sync/force-resync')
  @ApiOperation({
    summary: 'Force re-sync data from Binance API, overwriting existing data (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Force re-sync completed successfully',
  })
  async forceResync(
    @Body()
    body: {
      symbol?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const symbol = body.symbol || 'BTC/USD';
    const startDate = body.startDate
      ? new Date(body.startDate)
      : new Date('2020-01-01');
    const endDate = body.endDate
      ? new Date(body.endDate)
      : new Date('2025-12-31');

    await this.marketDataSyncService.forceResyncDateRange(
      symbol,
      '1d',
      startDate,
      endDate,
    );
    return {
      message: `Force re-sync completed for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    };
  }
}
