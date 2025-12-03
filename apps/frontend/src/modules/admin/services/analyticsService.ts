import type { User } from '@/shared/types/auth'

// Use environment variable for API URL in production, relative path in development
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/admin/analytics`
  : '/api/v1/admin/analytics'

export interface DashboardStats {
  totalComparisons: number
  uniqueStrategies: number
  avgBestReturn: number
  mostPopularStrategy: string
  recentActivityCount: number
}

export interface PopularStrategy {
  strategyId: string
  count: number
  avgReturn: number
  maxReturn: number
}

export interface TopPerformingStrategy {
  strategyId: string
  strategyName: string
  variantName?: string
  totalReturn: number
  finalValue: number
  createdAt: string
}

export interface PopularShare {
  shortCode: string
  viewCount: number
  lastViewedAt: string | null
  createdAt: string
}

export interface StrategyStats {
  totalRuns: number
  avgReturn: number
  maxReturn: number
  minReturn: number
  winRate: number
}

export interface ComparisonRun {
  id: string
  userId: string | null
  strategies: string[]
  startDate: string
  endDate: string
  timeframe: string
  investmentAmount: number | null
  initialPortfolio: any | null
  fundingSchedule: any | null
  results: Array<{
    strategyId: string
    strategyName: string
    variantName?: string
    totalReturn: number
    finalValue: number
    avgBuyPrice: number
    maxDrawdown: number
    sharpeRatio: number
    totalInvestment: number
    totalQuantity: number
  }>
  bestStrategyId: string
  bestReturn: number
  createdAt: string
  updatedAt: string
}

export interface PaginatedComparisonRuns {
  data: ComparisonRun[]
  total: number
  page: number
  limit: number
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || error.data?.message || 'Request failed')
  }

  const responseData = await response.json()

  // Check if response is wrapped in { data: ... } format
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return responseData.data as T
  }

  return responseData as T
}

export const analyticsService = {
  /**
   * Get dashboard overview statistics
   */
  async getDashboard(
    startDate?: string,
    endDate?: string,
  ): Promise<DashboardStats> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const url = `${API_BASE_URL}/dashboard${params.toString() ? `?${params.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<DashboardStats>(response)
  },

  /**
   * Get most popular strategies
   */
  async getPopularStrategies(
    limit: number = 10,
    startDate?: string,
    endDate?: string,
  ): Promise<PopularStrategy[]> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await fetch(`${API_BASE_URL}/popular-strategies?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<PopularStrategy[]>(response)
  },

  /**
   * Get top performing strategies
   */
  async getTopPerforming(
    limit: number = 10,
    startDate?: string,
    endDate?: string,
  ): Promise<TopPerformingStrategy[]> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await fetch(`${API_BASE_URL}/top-performing?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<TopPerformingStrategy[]>(response)
  },

  /**
   * Get recent comparisons
   */
  async getRecentComparisons(limit: number = 20): Promise<ComparisonRun[]> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())

    const response = await fetch(`${API_BASE_URL}/recent-comparisons?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<ComparisonRun[]>(response)
  },

  /**
   * Get statistics for a specific strategy
   */
  async getStrategyStats(
    strategyId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<StrategyStats> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await fetch(
      `${API_BASE_URL}/strategy/${strategyId}?${params.toString()}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      },
    )

    return handleResponse<StrategyStats>(response)
  },

  /**
   * Get popular shared comparisons
   */
  async getSharedComparisons(limit: number = 10): Promise<PopularShare[]> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())

    const response = await fetch(`${API_BASE_URL}/shared-comparisons?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<PopularShare[]>(response)
  },

  /**
   * Get paginated comparison runs
   */
  async getComparisonRuns(
    page: number = 1,
    limit: number = 20,
    startDate?: string,
    endDate?: string,
  ): Promise<PaginatedComparisonRuns> {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await fetch(`${API_BASE_URL}/comparison-runs?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<PaginatedComparisonRuns>(response)
  },

  /**
   * Trigger manual cleanup
   */
  async cleanup(retentionDays: number = 365): Promise<{ message: string; deletedCount: number }> {
    const params = new URLSearchParams()
    params.append('retentionDays', retentionDays.toString())

    const response = await fetch(`${API_BASE_URL}/cleanup?${params.toString()}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })

    return handleResponse<{ message: string; deletedCount: number }>(response)
  },
}

