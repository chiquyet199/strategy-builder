import type { StrategyConfig } from '@/shared/types/backtest'

/**
 * Generate a unique identifier for a strategy instance
 * Based on strategyId + parameters hash
 */
export function generateStrategyIdentifier(config: StrategyConfig): string {
  const paramsStr = JSON.stringify(config.parameters || {})
  // Simple hash function for parameters
  let hash = 0
  for (let i = 0; i < paramsStr.length; i++) {
    const char = paramsStr.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  const paramsHash = Math.abs(hash).toString(36)
  return `${config.strategyId}_${paramsHash}`
}

/**
 * Check if two strategy configs are the same (same strategyId and parameters)
 */
export function isSameStrategyConfig(
  config1: StrategyConfig,
  config2: StrategyConfig,
): boolean {
  return (
    config1.strategyId === config2.strategyId &&
    JSON.stringify(config1.parameters || {}) === JSON.stringify(config2.parameters || {})
  )
}

/**
 * Find strategy config by unique identifier
 */
export function findStrategyByIdentifier(
  strategies: StrategyConfig[],
  identifier: string,
): StrategyConfig | undefined {
  return strategies.find((s) => generateStrategyIdentifier(s) === identifier)
}

/**
 * Find all strategy configs with the same strategyId (different variants)
 */
export function findStrategyVariants(
  strategies: StrategyConfig[],
  strategyId: string,
): StrategyConfig[] {
  return strategies.filter((s) => s.strategyId === strategyId)
}

