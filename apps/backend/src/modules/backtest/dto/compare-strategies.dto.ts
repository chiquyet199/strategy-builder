import {
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  IsIn,
  IsObject,
  IsNotEmpty,
  Min,
  ArrayMinSize,
  ValidateNested,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Asset, InitialPortfolio, FundingSchedule } from '../../strategy/interfaces/strategy-result.interface';

/**
 * Strategy configuration DTO
 * Supports optional parameters for future customization
 */
export class StrategyConfigDto {
  @ApiProperty({
    description: 'Strategy identifier',
    example: 'lump-sum',
    enum: [
      'lump-sum',
      'dca',
      'rsi-dca',
      'dip-buyer-dca',
      'moving-average-dca',
      'combined-smart-dca',
    ],
  })
  @IsString()
  @IsNotEmpty()
  strategyId: string;

  @ApiPropertyOptional({
    description: 'Strategy-specific parameters (optional, uses defaults if not provided)',
    example: { rsiPeriod: 14, oversoldThreshold: 30 },
  })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Custom name for parameter variant comparisons',
    example: 'Aggressive RSI',
  })
  @IsString()
  @IsOptional()
  variantName?: string;
}

/**
 * Asset DTO for initial portfolio
 */
export class AssetDto {
  @ApiProperty({ description: 'Asset symbol (e.g., "BTC", "ETH")', example: 'BTC' })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({ description: 'Quantity of the asset', example: 0.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;
}

/**
 * Initial Portfolio DTO
 */
export class InitialPortfolioDto {
  @ApiProperty({
    description: 'Array of assets in the portfolio',
    type: [AssetDto],
    example: [{ symbol: 'BTC', quantity: 0.5 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetDto)
  assets: AssetDto[];

  @ApiProperty({
    description: 'Starting USDC amount',
    example: 2000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  usdcAmount: number;
}

/**
 * Funding Schedule DTO
 */
export class FundingScheduleDto {
  @ApiProperty({
    description: 'Funding frequency',
    enum: ['daily', 'weekly', 'monthly'],
    example: 'weekly',
  })
  @IsIn(['daily', 'weekly', 'monthly'])
  frequency: 'daily' | 'weekly' | 'monthly';

  @ApiProperty({
    description: 'USD amount per funding period (0 means no funding)',
    example: 500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}

/**
 * Compare strategies request DTO
 * Supports both old format (investmentAmount) and new format (initialPortfolio)
 */
export class CompareStrategiesDto {
  @ApiPropertyOptional({
    description: 'Total investment amount in USD (legacy - use initialPortfolio instead)',
    example: 10000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @ValidateIf((o) => !o.initialPortfolio)
  investmentAmount?: number;

  @ApiPropertyOptional({
    description: 'Initial portfolio configuration (assets + USDC)',
    type: InitialPortfolioDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InitialPortfolioDto)
  @ValidateIf((o) => !o.investmentAmount)
  initialPortfolio?: InitialPortfolioDto;

  @ApiPropertyOptional({
    description: 'Periodic funding schedule',
    type: FundingScheduleDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FundingScheduleDto)
  fundingSchedule?: FundingScheduleDto;

  @ApiProperty({
    description: 'Start date (ISO 8601 format)',
    example: '2020-01-01T00:00:00.000Z',
  })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date (ISO 8601 format)',
    example: '2025-11-28T23:59:59.999Z',
  })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'Array of strategy configurations to compare',
    type: [StrategyConfigDto],
    example: [
      { strategyId: 'lump-sum' },
      { strategyId: 'dca', parameters: { frequency: 'weekly' } },
      { strategyId: 'rsi-dca', parameters: { rsiPeriod: 14 }, variantName: 'Aggressive RSI' },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StrategyConfigDto)
  strategies: StrategyConfigDto[];

  @ApiPropertyOptional({
    description: 'Candlestick timeframe',
    enum: ['1h', '4h', '1d', '1w', '1m'],
    example: '1d',
    default: '1d',
  })
  @IsOptional()
  @IsIn(['1h', '4h', '1d', '1w', '1m'])
  timeframe?: '1h' | '4h' | '1d' | '1w' | '1m' = '1d';
}

