import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    // Log JWT_SECRET status (don't log the actual secret for security)
    console.log('JWT Strategy: Initializing with JWT_SECRET:', {
      isSet: !!process.env.JWT_SECRET,
      length: jwtSecret.length,
      firstChar: jwtSecret.substring(0, 1),
    });
    
    // Custom extractor to handle "Bearer Bearer" issue
    const extractJwt = (request: any) => {
      const authHeader = request.headers?.authorization;
      if (!authHeader) {
        return null;
      }
      
      // Handle duplicate "Bearer Bearer" case
      if (authHeader.startsWith('Bearer Bearer ')) {
        console.warn('JWT Strategy: Detected duplicate "Bearer" in header, fixing...');
        return authHeader.substring(14); // Skip "Bearer Bearer "
      }
      
      // Normal case: "Bearer <token>"
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7); // Skip "Bearer "
      }
      
      return authHeader;
    };
    
    super({
      jwtFromRequest: extractJwt,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    console.log('JWT Strategy: validate() called with payload:', {
      hasSub: !!payload.sub,
      hasEmail: !!payload.email,
      sub: payload.sub,
      email: payload.email,
    });

    if (!payload.sub || !payload.email) {
      console.error('JWT Strategy: Missing required payload fields (sub or email)');
      throw new UnauthorizedException('Invalid token payload');
    }

    // Fetch user to get latest role (in case it changed after token was issued)
    console.log('JWT Strategy: Fetching user from database with id:', payload.sub);
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      console.error('JWT Strategy: User not found in database for id:', payload.sub);
      throw new UnauthorizedException('User not found');
    }

    // Debug logging (can be removed in production)
    console.log('JWT Strategy Debug:', {
      userId: payload.sub,
      email: payload.email,
      userRole: user.role,
      userRoleType: typeof user.role,
      masterRole: UserRole.MASTER,
      roleMatch: user.role === UserRole.MASTER,
    });

    return {
      userId: payload.sub,
      email: payload.email,
      role: user.role,
    };
  }
}
