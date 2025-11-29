import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './modules/email/email.module';
import { LoggerModule } from './common/logger/logger.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { ThrottlerStorageModule } from './common/storage/throttler-storage.module';
import { RedisThrottlerStorage } from './common/storage/redis-throttler.storage';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { getDatabaseConfig } from './config/database.config';
import { User } from './modules/auth/entities/user.entity';

// Database config is loaded lazily to ensure .env file is loaded first
// The .env file is loaded in main.ts before AppModule is imported
const dbConfig = getDatabaseConfig();

@Module({
  imports: [
    LoggerModule,
    TypeOrmModule.forRoot({
      ...dbConfig,
      entities: [User],
      synchronize: process.env.NODE_ENV !== 'production', // Auto-sync schema in dev, use migrations in prod
      logging: process.env.NODE_ENV === 'development',
    }),
    ThrottlerStorageModule,
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerStorageModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 60000, // 1 minute
            limit: 10, // 10 requests per minute (default)
          },
          {
            name: 'medium',
            ttl: 300000, // 5 minutes
            limit: 20, // 20 requests per 5 minutes
          },
          {
            name: 'long',
            ttl: 3600000, // 1 hour
            limit: 100, // 100 requests per hour
          },
        ],
        storage,
      }),
    }),
    EmailModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Reflector,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
