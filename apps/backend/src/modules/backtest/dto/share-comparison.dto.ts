import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { CompareStrategiesDto } from './compare-strategies.dto';

export class CreateShareDto {
  @ApiProperty({
    description: 'Comparison configuration to share',
    type: CompareStrategiesDto,
  })
  @IsObject()
  config: CompareStrategiesDto;

  @ApiPropertyOptional({
    description: 'Number of days until the shared link expires (optional)',
    example: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}

export class ShareResponseDto {
  @ApiProperty({
    description: 'Short code for the shared comparison',
    example: 'abc12345',
  })
  shortCode: string;

  @ApiProperty({
    description: 'Full URL to access the shared comparison',
    example: 'https://example.com/s/abc12345',
  })
  url: string;
}

