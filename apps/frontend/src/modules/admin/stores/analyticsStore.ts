import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { analyticsService, type DashboardStats, type PopularStrategy, type TopPerformingStrategy, type PopularShare, type ComparisonRun } from '../services/analyticsService'

export const useAnalyticsStore = defineStore('analytics', () => {
  // State
  const dashboardStats = ref<DashboardStats | null>(null)
  const popularStrategies = ref<PopularStrategy[]>([])
  const topPerforming = ref<TopPerformingStrategy[]>([])
  const recentComparisons = ref<ComparisonRun[]>([])
  const sharedComparisons = ref<PopularShare[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)

  // Cache TTL (5 minutes)
  const CACHE_TTL = 5 * 60 * 1000

  // Computed
  const isStale = computed(() => {
    if (!lastUpdated.value) return true
    return Date.now() - lastUpdated.value.getTime() > CACHE_TTL
  })

  // Actions
  async function loadDashboard(startDate?: string, endDate?: string) {
    isLoading.value = true
    error.value = null

    try {
      dashboardStats.value = await analyticsService.getDashboard(startDate, endDate)
      lastUpdated.value = new Date()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load dashboard'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loadPopularStrategies(limit: number = 10, startDate?: string, endDate?: string) {
    isLoading.value = true
    error.value = null

    try {
      popularStrategies.value = await analyticsService.getPopularStrategies(limit, startDate, endDate)
      lastUpdated.value = new Date()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load popular strategies'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loadTopPerforming(limit: number = 10, startDate?: string, endDate?: string) {
    isLoading.value = true
    error.value = null

    try {
      topPerforming.value = await analyticsService.getTopPerforming(limit, startDate, endDate)
      lastUpdated.value = new Date()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load top performing strategies'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loadRecentComparisons(limit: number = 20) {
    isLoading.value = true
    error.value = null

    try {
      recentComparisons.value = await analyticsService.getRecentComparisons(limit)
      lastUpdated.value = new Date()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load recent comparisons'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loadSharedComparisons(limit: number = 10) {
    isLoading.value = true
    error.value = null

    try {
      sharedComparisons.value = await analyticsService.getSharedComparisons(limit)
      lastUpdated.value = new Date()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load shared comparisons'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function refreshAll(startDate?: string, endDate?: string) {
    isLoading.value = true
    error.value = null

    try {
      await Promise.all([
        loadDashboard(startDate, endDate),
        loadPopularStrategies(10, startDate, endDate),
        loadTopPerforming(10, startDate, endDate),
        loadRecentComparisons(20),
        loadSharedComparisons(10),
      ])
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to refresh analytics'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function clearCache() {
    dashboardStats.value = null
    popularStrategies.value = []
    topPerforming.value = []
    recentComparisons.value = []
    sharedComparisons.value = []
    lastUpdated.value = null
  }

  return {
    // State
    dashboardStats,
    popularStrategies,
    topPerforming,
    recentComparisons,
    sharedComparisons,
    isLoading,
    error,
    lastUpdated,
    // Computed
    isStale,
    // Actions
    loadDashboard,
    loadPopularStrategies,
    loadTopPerforming,
    loadRecentComparisons,
    loadSharedComparisons,
    refreshAll,
    clearCache,
  }
})

