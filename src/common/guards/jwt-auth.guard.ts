import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.verifyToken(token);
      request['user'] = payload;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async verifyToken(token: string): Promise<JWTPayload> {
    const jwksUrl = this.configService.get<string>('BETTERAUTH_JWKS_URL');
    const issuer = this.configService.get<string>('BETTERAUTH_ISSUER');
    const audience = this.configService.get<string>('BETTERAUTH_AUDIENCE');

    // Prefer BetterAuth JWKS verification when configured
    if (jwksUrl) {
      if (!this.jwks) {
        this.jwks = createRemoteJWKSet(new URL(jwksUrl));
      }

      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: issuer || undefined,
        audience: audience || undefined,
      });

      return payload;
    }

    // Fallback to local secret-based verification
    return this.jwtService.verifyAsync(token);
  }
}
