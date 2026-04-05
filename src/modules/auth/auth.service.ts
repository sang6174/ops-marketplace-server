// src/modules/auth/auth.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AccountStatus,
  UserRole,
} from '@infrastructure/generated/prisma/enums';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { hashPassword, comparePassword } from '@common/utils';
import {
  InvalidCredentialsException,
  AccountSuspendedException,
  AccountPendingException,
  ResourceAlreadyExistsException,
} from '@common/exceptions';
import {
  RegisterDto,
  LoginDto,
  JwtPayload,
  AuthUser,
  TokenType,
  TokenPair,
} from './dtos/auth.dto';
import { SALT_ROUNDS } from '../../common/constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ===== Register =====

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ResourceAlreadyExistsException('Email', dto.email);
    }

    const hashedPassword = await hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          status: AccountStatus.ACTIVE,
        },
      });

      await tx.userRoleMapping.create({
        data: { userId: newUser.id, role: UserRole.BUYER },
      });

      return newUser;
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  // ===== Login =====

  async login(
    dto: LoginDto,
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: true },
    });

    if (!user || !user.password) {
      throw new InvalidCredentialsException();
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new AccountSuspendedException();
    }

    if (user.status === AccountStatus.PENDING) {
      throw new AccountPendingException();
    }

    const isMatch = await comparePassword(dto.password, user.password);
    if (!isMatch) {
      throw new InvalidCredentialsException();
    }

    const tokens = await this.generateTokensAndSession(
      user.id,
      user.email,
      meta,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((r) => r.role),
      },
      ...tokens,
    };
  }

  // ===== Refresh =====

  async refresh(userId: string, sessionId: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User không tồn tại');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return this.generateTokensAndSession(userId, user.email);
  }

  // ===== Logout =====

  async logout(user: AuthUser): Promise<void> {
    await this.prisma.session.update({
      where: { id: user.sessionId },
      data: { revokedAt: new Date() },
    });
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private async generateTokensAndSession(
    userId: string,
    email: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    const sessionId = randomUUID();

    // Tạo token pair
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      sessionId,
      type: TokenType.ACCESS,
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
      email,
      sessionId,
      type: TokenType.REFRESH,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('jwt.accessSecret')!,
        expiresIn: this.configService.get<number>(
          'jwt.accessExpiresInSeconds',
        )!,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('jwt.refreshSecret')!,
        expiresIn: this.configService.get<number>(
          'jwt.refreshExpiresInSeconds',
        )!,
      }),
    ]);

    const hashedRefresh = await bcrypt.hash(refreshToken, SALT_ROUNDS);

    const expiresAt = new Date(
      Date.now() +
        this.configService.get<number>('jwt.refreshExpiresInSeconds')! * 1000,
    );

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshToken: hashedRefresh,
        expiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    return { accessToken, refreshToken, sessionId };
  }
}
