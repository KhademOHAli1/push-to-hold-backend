import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * Authentication service handling user registration, login, and profile retrieval.
 * Uses JWT tokens for authentication and bcrypt for password hashing.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user with email and password.
   * @param dto - Registration data (email, password, optional displayName)
   * @returns JWT token and user data (without password)
   * @throws ConflictException if email already exists
   */
  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create user with profile
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: hashedPassword,
        role: 'consumer',
        profile: {
          create: {
            displayName: dto.displayName ?? null,
          },
        },
      },
      include: { profile: true },
    });

    const token = await this.signToken(user.id, user.email, user.role);
    return { 
      token, 
      user: this.toSafeUser(user) 
    };
  }

  /**
   * Authenticate user with email and password.
   * @param dto - Login credentials (email, password)
   * @returns JWT token and user data (without password)
   * @throws UnauthorizedException if credentials are invalid or account is deactivated
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.signToken(user.id, user.email, user.role);
    return { 
      token, 
      user: this.toSafeUser(user) 
    };
  }

  /**
   * Get user profile by ID.
   * @param userId - The user's UUID
   * @returns User data with profile and company memberships
   * @throws UnauthorizedException if user not found
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { 
        profile: true,
        companyMemberships: {
          include: {
            company: {
              select: {
                id: true,
                displayName: true,
                officialName: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toSafeUser(user);
  }

  private async signToken(id: string, email: string, role: string): Promise<string> {
    return this.jwtService.signAsync({ 
      sub: id, 
      email, 
      role 
    });
  }

  private toSafeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
