// src/modules/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  JwtPayload,
  AuthUser,
  TokenType,
  TokenPair,
} from './dtos/auth.dto';
import { SALT_ROUNDS } from '../../common/constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly verifyTokenTtlMs = 24 * 60 * 60 * 1000;
  private readonly resetTokenTtlMs = 15 * 60 * 1000;

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
    const verificationToken = this.createToken('verify');

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          status: AccountStatus.PENDING,
        },
      });

      await tx.userRoleMapping.create({
        data: { userId: newUser.id, role: UserRole.BUYER },
      });

      await tx.passwordReset.create({
        data: {
          userId: newUser.id,
          token: verificationToken,
          expiresAt: new Date(Date.now() + this.verifyTokenTtlMs),
        },
      });

      return newUser;
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      verificationToken,
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
      throw new UnauthorizedException('Người dùng không tồn tại');
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

  // ===== Verify Email =====

  async verifyEmail(dto: VerifyEmailDto) {
    const token = await this.prisma.passwordReset.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!token || token.used || !token.token.startsWith('verify_')) {
      throw new BadRequestException('Token xác thực email không hợp lệ');
    }

    if (new Date() > token.expiresAt) {
      throw new BadRequestException('Token xác thực email đã hết hạn');
    }

    if (token.user.status === AccountStatus.SUSPENDED) {
      throw new AccountSuspendedException();
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { status: AccountStatus.ACTIVE },
      }),
      this.prisma.passwordReset.update({
        where: { id: token.id },
        data: { used: true },
      }),
    ]);

    return { message: 'Xác thực email thành công' };
  }

  // ===== Forgot Password =====

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      return {
        message: 'Nếu email tồn tại, token đặt lại mật khẩu đã được tạo',
      };
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new AccountSuspendedException();
    }

    const resetToken = this.createToken('reset');

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + this.resetTokenTtlMs),
      },
    });

    return {
      message: 'Token đặt lại mật khẩu đã được tạo',
      resetToken,
    };
  }

  // ===== Reset Password =====

  async resetPassword(dto: ResetPasswordDto) {
    const token = await this.prisma.passwordReset.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!token || token.used || !token.token.startsWith('reset_')) {
      throw new BadRequestException('Token đặt lại mật khẩu không hợp lệ');
    }

    if (new Date() > token.expiresAt) {
      throw new BadRequestException('Token đặt lại mật khẩu đã hết hạn');
    }

    if (token.user.status === AccountStatus.SUSPENDED) {
      throw new AccountSuspendedException();
    }

    const hashedPassword = await hashPassword(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordReset.update({
        where: { id: token.id },
        data: { used: true },
      }),
      this.prisma.session.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  // ===== Change Password =====

  async changePassword(user: AuthUser, dto: ChangePasswordDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!existing?.password) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    const isMatch = await comparePassword(
      dto.currentPassword,
      existing.password,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    const hashedPassword = await hashPassword(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      this.prisma.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
          NOT: { id: user.sessionId },
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Đổi mật khẩu thành công' };
  }

  getRefreshTokenMaxAgeMs(): number {
    return (
      this.configService.get<number>('jwt.refreshExpiresInSeconds')! * 1000
    );
  }

  isProduction(): boolean {
    return this.configService.get<boolean>('app.isProduction', false);
  }

  // ===== Internal helpers =====
  private createToken(type: 'verify' | 'reset'): string {
    return `${type}_${randomUUID()}`;
  }

  private async generateTokensAndSession(
    userId: string,
    email: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    const sessionId = randomUUID();

    // Create the token pair
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
