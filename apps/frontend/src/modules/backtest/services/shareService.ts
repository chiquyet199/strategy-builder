import type { CompareStrategiesRequest } from '@/shared/types/backtest'

// Use environment variable for API URL in production, relative path in development
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/backtest`
  : '/api/v1/backtest'

export interface ShareResponse {
  shortCode: string
  url: string
}

export interface CreateShareRequest {
  config: CompareStrategiesRequest
  expiresInDays?: number
}

export const shareService = {
  /**
   * Generate a shareable short URL for a comparison configuration
   */
  async generateShareUrl(
    config: CompareStrategiesRequest,
    expiresInDays?: number,
  ): Promise<ShareResponse> {
    const request: CreateShareRequest = {
      config,
      ...(expiresInDays && { expiresInDays }),
    }

    const response = await fetch(`${API_BASE_URL}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create share URL' }))
      throw new Error(error.message || error.data?.message || 'Failed to create share URL')
    }

    const responseData = await response.json()

    // Check if response is wrapped in { data: ... } format
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      return responseData.data as ShareResponse
    }

    return responseData as ShareResponse
  },

  /**
   * Get shared comparison configuration by short code
   */
  async getSharedConfig(shortCode: string): Promise<CompareStrategiesRequest> {
    const response = await fetch(`${API_BASE_URL}/share/${shortCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to get shared config' }))
      throw new Error(error.message || error.data?.message || 'Failed to get shared config')
    }

    const responseData = await response.json()

    // Check if response is wrapped in { data: ... } format
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      return responseData.data as CompareStrategiesRequest
    }

    return responseData as CompareStrategiesRequest
  },

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  },
}

