const API_BASE_URL = '/api'

export interface HealthResponse {
  status: string
  message: string
  timestamp: string
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`)
    if (!response.ok) {
      throw new Error('Failed to fetch health status')
    }
    return response.json()
  },

  async getHello(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}`)
    if (!response.ok) {
      throw new Error('Failed to fetch hello message')
    }
    return response.text()
  },
}

