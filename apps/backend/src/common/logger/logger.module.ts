import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { loggerConfig } from './logger.config';

/**
 * Global Logger Module
 * Provides structured logging throughout the application
 * - Request correlation IDs for traceability
 * - Structured JSON logging in production
 * - Human-readable logging in development
 */
@Global()
@Module({
  imports: [WinstonModule.forRoot(loggerConfig)],
  exports: [WinstonModule],
})
export class LoggerModule {}

