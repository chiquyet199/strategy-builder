/**
 * Strategy Builder Store
 * Manages state for the custom strategy builder
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CustomStrategyConfig,
  ValidationResult,
} from '../api/strategyBuilderApi'

export const useStrategyBuilderStore = defineStore('strategyBuilder', () => {
  // Current strategy being built
  const currentStrategy = ref<CustomStrategyConfig | null>(null)

  // Validation state
  const validationResult = ref<ValidationResult | null>(null)
  const isValidating = ref(false)

  // UI state
  const isSaving = ref(false)

  // Computed
  const hasRules = computed(() => {
    return currentStrategy.value?.rules && currentStrategy.value.rules.length > 0
  })

  const enabledRules = computed(() => {
    if (!currentStrategy.value?.rules) return []
    return currentStrategy.value.rules.filter((rule) => rule.enabled !== false)
  })

  // Synchronous actions
  function setCurrentStrategy(strategy: CustomStrategyConfig | null): void {
    currentStrategy.value = strategy
  }

  function setValidationResult(result: ValidationResult | null): void {
    validationResult.value = result
  }

  function setValidating(isValidatingValue: boolean): void {
    isValidating.value = isValidatingValue
  }

  function setSaving(isSavingValue: boolean): void {
    isSaving.value = isSavingValue
  }

  function addRule(rule: CustomStrategyConfig['rules'][0]): void {
    if (!currentStrategy.value) {
      currentStrategy.value = { rules: [] }
    }
    currentStrategy.value.rules.push(rule)
  }

  function updateRule(ruleId: string, updatedRule: Partial<CustomStrategyConfig['rules'][0]>): void {
    if (!currentStrategy.value?.rules) return
    const index = currentStrategy.value.rules.findIndex((r) => r.id === ruleId)
    if (index !== -1) {
      currentStrategy.value.rules[index] = {
        ...currentStrategy.value.rules[index],
        ...updatedRule,
      }
    }
  }

  function deleteRule(ruleId: string): void {
    if (!currentStrategy.value?.rules) return
    currentStrategy.value.rules = currentStrategy.value.rules.filter(
      (r) => r.id !== ruleId,
    )
  }

  function setStrategyName(name: string): void {
    if (!currentStrategy.value) {
      currentStrategy.value = { rules: [] }
    }
    currentStrategy.value.name = name
  }

  function reset(): void {
    currentStrategy.value = null
    validationResult.value = null
    isValidating.value = false
    isSaving.value = false
  }

  return {
    // State
    currentStrategy,
    validationResult,
    isValidating,
    isSaving,
    // Computed
    hasRules,
    enabledRules,
    // Actions
    setCurrentStrategy,
    setValidationResult,
    setValidating,
    setSaving,
    addRule,
    updateRule,
    deleteRule,
    setStrategyName,
    reset,
  }
})

