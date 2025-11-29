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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}

/**
 * Compare strategies request DTO
 */
export class CompareStrategiesDto {
  @ApiProperty({
    description: 'Total investment amount in USD',
    example: 10000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  investmentAmount: number;

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
      { strategyId: 'rsi-dca', parameters: { rsiPeriod: 14 } },
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

