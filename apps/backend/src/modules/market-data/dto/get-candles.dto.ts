import { IsString, IsIn, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Timeframe } from '../interfaces/candlestick.interface';

export class GetCandlesDto {
  @ApiProperty({
    description: 'Trading pair symbol (e.g., BTC/USD)',
    example: 'BTC/USD',
    default: 'BTC/USD',
  })
  @IsString()
  @IsOptional()
  symbol?: string = 'BTC/USD';

  @ApiProperty({
    description: 'Candlestick timeframe',
    enum: ['1h', '4h', '1d', '1w', '1m'],
    example: '1d',
    default: '1d',
  })
  @IsIn(['1h', '4h', '1d', '1w', '1m'])
  @IsOptional()
  timeframe?: Timeframe = '1d';

  @ApiProperty({
    description: 'Start date (ISO 8601 format)',
    example: '2020-01-01T00:00:00.000Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date (ISO 8601 format)',
    example: '2025-11-28T23:59:59.999Z',
  })
  @IsDateString()
  endDate: string;
}

