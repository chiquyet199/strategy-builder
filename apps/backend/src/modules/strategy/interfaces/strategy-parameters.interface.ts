/**
 * Strategy parameter interfaces
 * Define parameter types for each strategy for type safety
 */

export interface RsiDcaParameters {
  rsiPeriod?: number; // Default: 14
  oversoldThreshold?: number; // Default: 30
  overboughtThreshold?: number; // Default: 70
  buyMultiplier?: number; // Default: 2.0
}

export interface DipBuyerDcaParameters {
  lookbackDays?: number; // Default: 30
  dropThreshold?: number; // Default: 0.10 (10%)
  buyMultiplier?: number; // Default: 2.0
}

export interface MovingAverageDcaParameters {
  maPeriod?: number; // Default: 200
  buyMultiplier?: number; // Default: 2.0
}

export interface CombinedSmartDcaParameters {
  rsiPeriod?: number; // Default: 14
  oversoldThreshold?: number; // Default: 30
  maPeriod?: number; // Default: 200
  lookbackDays?: number; // Default: 30
  dropThreshold?: number; // Default: 0.10
  maxMultiplier?: number; // Default: 2.5
}

