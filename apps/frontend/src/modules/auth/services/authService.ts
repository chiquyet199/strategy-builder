import { authApi } from '../api/authApi'
import { useAuthStore } from '../stores/authStore'
import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '@/shared/types/auth'

class AuthService {
  private store = useAuthStore()

  async login(credentials: LoginRequest): Promise<void> {
    this.store.setLoading(true)
    this.store.setError(null)
    
    try {
      const response = await authApi.login(credentials)
      this.store.setToken(response.access_token)
      this.store.setUser(response.user)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      this.store.setError(errorMessage)
      throw err
    } finally {
      this.store.setLoading(false)
    }
  }

  async register(data: RegisterRequest): Promise<void> {
    this.store.setLoading(true)
    this.store.setError(null)
    
    try {
      const response = await authApi.register(data)
      this.store.setToken(response.access_token)
      this.store.setUser(response.user)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      this.store.setError(errorMessage)
      throw err
    } finally {
      this.store.setLoading(false)
    }
  }

  async fetchProfile(): Promise<void> {
    if (!this.store.token) {
      throw new Error('No token available')
    }

    this.store.setLoading(true)
    this.store.setError(null)
    
    try {
      const profile = await authApi.getProfile()
      this.store.setUser(profile)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile'
      this.store.setError(errorMessage)
      
      if (err instanceof Error && err.message === 'Unauthorized') {
        this.logout()
      }
      throw err
    } finally {
      this.store.setLoading(false)
    }
  }

  logout(): void {
    this.store.setToken(null)
    this.store.setUser(null)
    this.store.setError(null)
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    this.store.setLoading(true)
    this.store.setError(null)

    try {
      await authApi.forgotPassword(data)
      // Token is sent via email, never returned in response for security
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send reset email'
      this.store.setError(errorMessage)
      throw err
    } finally {
      this.store.setLoading(false)
    }
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    this.store.setLoading(true)
    this.store.setError(null)

    try {
      await authApi.resetPassword(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password'
      this.store.setError(errorMessage)
      throw err
    } finally {
      this.store.setLoading(false)
    }
  }
}

export const authService = new AuthService()

