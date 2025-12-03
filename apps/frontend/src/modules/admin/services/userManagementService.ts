import type { User, UserRole } from '@/shared/types/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/admin/users`
  : '/api/v1/admin/users'

export interface CreateUserRequest {
  email: string
  name: string
  password: string
  role?: UserRole
}

export interface UpdateUserRequest {
  email?: string
  name?: string
  password?: string
  role?: UserRole
}

export interface UserListResponse {
  data: User[]
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

export const userManagementService = {
  /**
   * Get paginated list of users
   */
  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<UserListResponse> {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    if (search) params.append('search', search)

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<UserListResponse>(response)
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<User>(response)
  },

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    })

    return handleResponse<User>(response)
  },

  /**
   * Update user
   */
  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    })

    return handleResponse<User>(response)
  },

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    return handleResponse<{ message: string }>(response)
  },
}

