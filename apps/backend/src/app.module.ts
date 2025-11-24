import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './modules/email/email.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { ThrottlerStorageModule } from './common/storage/throttler-storage.module';
import { RedisThrottlerStorage } from './common/storage/redis-throttler.storage';
import { User } from './modules/auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'strategy',
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
  ],
})
export class AppModule {}
