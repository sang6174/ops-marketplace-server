// src/modules/auth/strategies/jwt-access.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { AuthUser, JwtPayload, TokenType } from '../dtos/auth.dto';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.type !== TokenType.ACCESS) {
      throw new UnauthorizedException('Loại token không hợp lệ');
    }

    // Check session validity (revoke logic)
    const session = await this.prisma.session.findFirst({
      where: { id: payload.sessionId, revokedAt: null },
    });

    if (!session) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }

    // Get user roles for authorization
    const userRoles = await this.prisma.userRoleMapping.findMany({
      where: { userId: payload.sub },
      select: { role: true },
    });

    return {
      id: payload.sub,
      email: payload.email,
      sessionId: payload.sessionId,
      roles: userRoles.map((r) => r.role),
    };
  }
}
