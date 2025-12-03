import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ComparisonRun Entity
 * Tracks comparison runs for analytics purposes
 * Stores summary metrics only (not full transaction history) for performance
 */
@Entity('comparison_runs')
@Index(['createdAt'])
@Index(['bestReturn'])
@Index(['createdAt', 'bestReturn'])
export class ComparisonRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string | null; // null for anonymous users

  @Column({ type: 'jsonb' })
  strategies: string[]; // Array of strategy IDs

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ length: 10 })
  timeframe: string; // '1h', '4h', '1d', '1w', '1m'

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  investmentAmount: number | null; // For backward compatibility

  @Column({ type: 'jsonb', nullable: true })
  initialPortfolio: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  fundingSchedule: Record<string, any> | null;

  /**
   * Results array with summary metrics per strategy
   * Structure: [
   *   {
   *     strategyId: string,
   *     strategyName: string,
   *     variantName?: string,
   *     totalReturn: number,
   *     finalValue: number,
   *     avgBuyPrice: number,
   *     maxDrawdown: number,
   *     sharpeRatio: number,
   *     totalInvestment: number,
   *     totalQuantity: number
   *   }
   * ]
   */
  @Column({ type: 'jsonb' })
  results: Array<{
    strategyId: string;
    strategyName: string;
    variantName?: string;
    totalReturn: number;
    finalValue: number;
    avgBuyPrice: number;
    maxDrawdown: number;
    sharpeRatio: number;
    totalInvestment: number;
    totalQuantity: number;
  }>;

  @Column({ length: 100 })
  bestStrategyId: string; // Strategy with highest totalReturn

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  bestReturn: number; // Highest totalReturn value

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

