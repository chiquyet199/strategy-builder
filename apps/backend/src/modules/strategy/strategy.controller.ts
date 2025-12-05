import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StrategyService } from './strategy.service';
import { CustomStrategyConfig } from './interfaces/custom-strategy.interface';
import { Public } from '../../modules/auth/guards/public.decorator';
import { StrategyPreviewResult } from './interfaces/preview-result.interface';

/**
 * Validation Result
 */
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  level: 'error';
  field: string;
  message: string;
}

interface ValidationWarning {
  level: 'warning' | 'info';
  field: string;
  message: string;
}

/**
 * Strategy Controller
 * Handles strategy-related endpoints
 */
@ApiTags('strategies')
@Controller('strategies')
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  /**
   * Validate a custom strategy configuration
   * Checks if the strategy rules are valid and can be executed
   */
  @Public()
  @Post('validate')
  @ApiOperation({ summary: 'Validate custom strategy configuration' })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              level: { type: 'string', enum: ['error'] },
              field: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
        warnings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              level: { type: 'string', enum: ['warning', 'info'] },
              field: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  })
  validate(@Body() config: CustomStrategyConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Use the strategy service to validate
      const customStrategy =
        this.strategyService.getStrategy('custom-strategy');
      customStrategy.validateParameters(config);
    } catch (error: any) {
      // Extract detailed error message
      const errorMessage = error?.message || 'Invalid strategy configuration';

      // Try to parse field-specific errors from the message
      // Format: "Rule {id}: {error message}" or "Rule at index {index}: {error message}"
      if (errorMessage.includes('Rule')) {
        errors.push({
          level: 'error',
          field: 'rules',
          message: errorMessage,
        });
      } else {
        errors.push({
          level: 'error',
          field: 'strategy',
          message: errorMessage,
        });
      }
    }

    // Additional validation checks
    if (config.rules && config.rules.length > 0) {
      // Check for duplicate rule IDs
      const ruleIds = config.rules.map((r) => r.id);
      const duplicateIds = ruleIds.filter(
        (id, index) => ruleIds.indexOf(id) !== index,
      );
      if (duplicateIds.length > 0) {
        errors.push({
          level: 'error',
          field: 'rules',
          message: `Duplicate rule IDs found: ${duplicateIds.join(', ')}`,
        });
      }

      // Check for rules with no enabled rules
      const enabledRules = config.rules.filter((r) => r.enabled !== false);
      if (enabledRules.length === 0) {
        warnings.push({
          level: 'warning',
          field: 'rules',
          message:
            'All rules are disabled. Strategy will not execute any actions.',
        });
      }

      // Check for rules with very high priority numbers
      const highPriorityRules = config.rules.filter(
        (r) => r.priority !== undefined && r.priority > 100,
      );
      if (highPriorityRules.length > 0) {
        warnings.push({
          level: 'info',
          field: 'rules',
          message:
            'Some rules have very high priority numbers. Lower numbers execute first.',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Preview custom strategy execution
   * Returns trigger information for live testing
   */
  @Public()
  @Post('preview')
  @ApiOperation({
    summary: 'Preview custom strategy execution with trigger information',
  })
  @ApiResponse({
    status: 200,
    description: 'Preview result with trigger information',
  })
  async preview(
    @Body()
    body: {
      config: CustomStrategyConfig;
      startDate: string;
      endDate: string;
      timeframe?: '1h' | '4h' | '1d' | '1w' | '1m';
      investmentAmount?: number;
      initialPortfolio?: {
        assets: Array<{ symbol: string; quantity: number }>;
        usdcAmount: number;
      };
      fundingSchedule?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        amount: number;
      };
    },
  ): Promise<StrategyPreviewResult> {
    // Validate strategy first
    try {
      const customStrategy =
        this.strategyService.getStrategy('custom-strategy');
      customStrategy.validateParameters(body.config);
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Invalid strategy configuration',
      );
    }

    // Get market data through strategy service
    const timeframe = body.timeframe || '1d';
    const candles = await this.strategyService.getMarketDataForPreview(
      'BTC/USD',
      timeframe,
      body.startDate,
      body.endDate,
    );

    if (candles.length === 0) {
      throw new BadRequestException(
        'No market data available for the specified date range',
      );
    }

    // Prepare parameters
    const initialPortfolio = body.initialPortfolio || {
      assets: [],
      usdcAmount: body.investmentAmount || 10000,
    };

    // Preview strategy
    return this.strategyService.previewCustomStrategy(
      candles,
      initialPortfolio,
      body.fundingSchedule,
      body.startDate,
      body.endDate,
      body.config,
    );
  }
}
