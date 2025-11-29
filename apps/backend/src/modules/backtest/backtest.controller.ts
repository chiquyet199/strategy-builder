import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BacktestService } from './backtest.service';
import { CompareStrategiesDto } from './dto/compare-strategies.dto';
import { BacktestResponse } from './interfaces/backtest-response.interface';
import { Public } from '../../modules/auth/guards/public.decorator';

@ApiTags('backtest')
@Controller('backtest')
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Public()
  @Post('compare')
  @ApiOperation({ summary: 'Compare multiple investment strategies' })
  @ApiResponse({
    status: 200,
    description: 'Strategy comparison completed successfully',
    schema: {
      example: {
        results: [
          {
            strategyId: 'lump-sum',
            strategyName: 'Lump Sum',
            parameters: {},
            transactions: [
              {
                date: '2020-01-01T00:00:00.000Z',
                price: 7200.5,
                amount: 10000,
                quantityPurchased: 1.3889,
                reason: 'Initial lump sum purchase',
                portfolioValue: {
                  coinValue: 10000,
                  usdcValue: 0,
                  totalValue: 10000,
                  quantityHeld: 1.3889,
                },
              },
            ],
            metrics: {
              totalReturn: 150.5,
              avgBuyPrice: 7200.5,
              maxDrawdown: 25.3,
              finalValue: 25050,
              sharpeRatio: 1.2,
              totalInvestment: 10000,
              totalQuantity: 1.3889,
            },
            portfolioValueHistory: [],
          },
        ],
        metadata: {
          investmentAmount: 10000,
          startDate: '2020-01-01T00:00:00.000Z',
          endDate: '2025-11-28T23:59:59.999Z',
          timeframe: '1d',
          calculatedAt: '2025-01-01T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async compare(@Body() dto: CompareStrategiesDto): Promise<BacktestResponse> {
    return this.backtestService.compareStrategies(dto);
  }
}

