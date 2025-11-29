import {
  Module,
  NestModule,
  MiddlewareConsumer,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './modules/email/email.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { StrategyModule } from './modules/strategy/strategy.module';
import { BacktestModule } from './modules/backtest/backtest.module';
import { LoggerModule } from './common/logger/logger.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { ThrottlerStorageModule } from './common/storage/throttler-storage.module';
import { RedisThrottlerStorage } from './common/storage/redis-throttler.storage';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { getDatabaseConfig } from './config/database.config';
import { User, UserRole } from './modules/auth/entities/user.entity';
import * as bcrypt from 'bcrypt';

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
    TypeOrmModule.forFeature([User]), // Required for master account setup
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
    MarketDataModule,
    StrategyModule,
    BacktestModule,
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
export class AppModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }

  /**
   * Initialize master account on application startup
   * Reads from environment variables: MASTER_EMAIL, MASTER_PASSWORD, MASTER_NAME
   * Only creates/updates if these variables are set
   */
  async onModuleInit() {
    const masterEmail = process.env.MASTER_EMAIL;
    const masterPassword = process.env.MASTER_PASSWORD;
    const masterName = process.env.MASTER_NAME || 'Master Admin';

    // Only proceed if MASTER_EMAIL is set
    if (!masterEmail) {
      this.logger.log(
        'ℹ️  MASTER_EMAIL not set in environment variables. Skipping master account setup.',
      );
      return;
    }

    try {
      this.logger.log(`🔍 Checking for master account: ${masterEmail}`);
      let user = await this.userRepository.findOne({
        where: { email: masterEmail },
      });

      if (user) {
        // Update existing user to master role
        if (user.role !== UserRole.MASTER) {
          user.role = UserRole.MASTER;
          await this.userRepository.save(user);
          this.logger.log(
            `✅ Updated user ${masterEmail} to MASTER role`,
          );
        } else {
          this.logger.log(
            `ℹ️  User ${masterEmail} already has MASTER role`,
          );
        }

        // Update password if MASTER_PASSWORD is provided
        if (masterPassword) {
          const hashedPassword = await bcrypt.hash(masterPassword, 10);
          user.password = hashedPassword;
          await this.userRepository.save(user);
          this.logger.log(`✅ Updated password for master account`);
        }
      } else {
        // Create new master account
        if (!masterPassword) {
          this.logger.warn(
            `⚠️  MASTER_PASSWORD not set. Cannot create master account for ${masterEmail}`,
          );
          return;
        }

        const hashedPassword = await bcrypt.hash(masterPassword, 10);
        const masterUser = this.userRepository.create({
          email: masterEmail,
          name: masterName,
          password: hashedPassword,
          role: UserRole.MASTER,
        });

        await this.userRepository.save(masterUser);
        this.logger.log(`✅ Created master account: ${masterEmail}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Error setting up master account: ${error.message}`,
        error.stack,
      );
    }
  }
}
