import { Module } from '@nestjs/common';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { MarketDataModule } from '../market-data/market-data.module';
import { StrategyModule } from '../strategy/strategy.module';

@Module({
  imports: [MarketDataModule, StrategyModule],
  controllers: [BacktestController],
  providers: [BacktestService],
})
export class BacktestModule {}

