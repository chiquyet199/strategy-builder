import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

// In-memory user store (replace with database in production)
interface User {
  id: string
  email: string
  name: string
  password: string
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class AuthService {
  private users: User[] = []

  constructor(private jwtService: JwtService) {}

  async register(registerDto: RegisterDto) {
    const existingUser = this.users.find((u) => u.email === registerDto.email)
    if (existingUser) {
      throw new ConflictException('User with this email already exists')
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10)
    const user: User = {
      id: Date.now().toString(),
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.users.push(user)

    const payload = { sub: user.id, email: user.email }
    const access_token = this.jwtService.sign(payload)

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    }
  }

  async login(loginDto: LoginDto) {
    const user = this.users.find((u) => u.email === loginDto.email)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload = { sub: user.id, email: user.email }
    const access_token = this.jwtService.sign(payload)

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    }
  }

  async getProfile(userId: string) {
    const user = this.users.find((u) => u.id === userId)
    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }
}

