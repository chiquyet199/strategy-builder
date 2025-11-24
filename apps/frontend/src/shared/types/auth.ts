export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface LoginResponse {
  access_token: string
  user: User
}

export interface RegisterResponse {
  access_token: string
  user: User
}

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ProfileResponse {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

