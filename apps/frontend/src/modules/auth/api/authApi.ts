import type { LoginRequest, RegisterRequest, LoginResponse, RegisterResponse, ProfileResponse } from '@/shared/types/auth'

const API_BASE_URL = '/api/auth'

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }))
      throw new Error(error.message || 'Login failed')
    }

    return response.json()
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Registration failed' }))
      throw new Error(error.message || 'Registration failed')
    }

    return response.json()
  },

  async getProfile(): Promise<ProfileResponse> {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No authentication token found')
    }

    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token')
        throw new Error('Unauthorized')
      }
      const error = await response.json().catch(() => ({ message: 'Failed to fetch profile' }))
      throw new Error(error.message || 'Failed to fetch profile')
    }

    return response.json()
  },
}

