/**
 * Preview Result Interface
 * Contains trigger information for strategy preview
 */

export interface TriggerPoint {
  date: string; // ISO 8601
  price: number;
  ruleId: string;
  ruleName?: string;
  conditionMet: string; // Description of why condition was met
  actionsExecuted: string[]; // Descriptions of actions that would execute
  severity?: number; // Condition severity (0-1)
}

export interface RuleTriggerSummary {
  ruleId: string;
  ruleName?: string;
  triggerCount: number;
  triggerPoints: TriggerPoint[];
}

export interface StrategyPreviewResult {
  totalTriggers: number;
  ruleSummaries: RuleTriggerSummary[];
  candles: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

