import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './modules/auth/guards/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'API root endpoint' })
  @ApiResponse({ status: 200, description: 'API is running' })
  getHello() {
    return {
      data: {
        message: this.appService.getHello(),
      },
      message: 'API is running',
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
    schema: {
      example: {
        data: {
          status: 'ok',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        message: 'Service is healthy',
      },
    },
  })
  getHealth() {
    return {
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
      message: 'Service is healthy',
    };
  }
}
