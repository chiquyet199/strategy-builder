import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { ShareComparisonService } from './services/share-comparison.service';
import { SharedComparison } from './entities/shared-comparison.entity';
import { MarketDataModule } from '../market-data/market-data.module';
import { StrategyModule } from '../strategy/strategy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SharedComparison]),
    MarketDataModule,
    StrategyModule,
  ],
  controllers: [BacktestController],
  providers: [BacktestService, ShareComparisonService],
})
export class BacktestModule {}
