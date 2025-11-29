import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MarketDataService } from './market-data.service';
import { GetCandlesDto } from './dto/get-candles.dto';
import { Candlestick } from './interfaces/candlestick.interface';
import { Public } from '../../modules/auth/guards/public.decorator';

@ApiTags('market-data')
@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

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
}

