import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Timeframe } from '../interfaces/candlestick.interface';

@Entity('candlesticks')
@Index(['symbol', 'timeframe', 'timestamp'], { unique: true })
@Index(['timestamp'])
@Index(['symbol', 'timeframe'])
export class Candlestick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  symbol: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  open: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  high: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  low: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  close: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  volume: number;

  @Column({
    type: 'enum',
    enum: ['1h', '4h', '1d', '1w', '1m'],
  })
  timeframe: Timeframe;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
