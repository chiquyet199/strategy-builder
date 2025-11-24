const API_BASE_URL = '/api/v1'

interface ApiResponse<T> {
  data: T
  message?: string
  meta?: Record<string, any>
}

export interface HealthResponse {
  status: string
  timestamp: string
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`)
    if (!response.ok) {
      throw new Error('Failed to fetch health status')
    }
    const result: ApiResponse<HealthResponse> = await response.json()
    return result.data
  },

  async getHello(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}`)
    if (!response.ok) {
      throw new Error('Failed to fetch hello message')
    }
    const result: ApiResponse<{ message: string }> = await response.json()
    return result.data.message
  },
}

