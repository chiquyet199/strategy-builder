import { Test, TestingModule } from '@nestjs/testing';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { CompareStrategiesDto } from './dto/compare-strategies.dto';

describe('BacktestController', () => {
  let controller: BacktestController;
  let backtestService: jest.Mocked<BacktestService>;

  const mockBacktestResponse = {
    results: [
      {
        strategyId: 'lump-sum',
        strategyName: 'Lump Sum',
        parameters: {},
        transactions: [],
        metrics: {
          totalReturn: 10.5,
          avgBuyPrice: 7280.3,
          maxDrawdown: 5.2,
          finalValue: 11050,
          sharpeRatio: 1.2,
          totalInvestment: 10000,
          totalQuantity: 1.3889,
        },
        portfolioValueHistory: [],
      },
    ],
    metadata: {
      investmentAmount: 10000,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      timeframe: '1d',
      calculatedAt: '2024-01-01T12:00:00.000Z',
    },
  };

  beforeEach(async () => {
    const mockBacktestService = {
      compareStrategies: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BacktestController],
      providers: [
        {
          provide: BacktestService,
          useValue: mockBacktestService,
        },
      ],
    }).compile();

    controller = module.get<BacktestController>(BacktestController);
    backtestService = module.get(BacktestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('compare', () => {
    const dto: CompareStrategiesDto = {
      strategies: [{ strategyId: 'lump-sum', parameters: {} }],
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      investmentAmount: 10000,
    };

    it('should compare strategies and return results', async () => {
      backtestService.compareStrategies.mockResolvedValue(mockBacktestResponse);

      const result = await controller.compare(dto);

      expect(backtestService.compareStrategies).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockBacktestResponse);
    });
  });
});

