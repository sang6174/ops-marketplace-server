// @ts-nocheck

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { hashPassword, comparePassword } from '@common/utils';
import {
  InvalidCredentialsException,
  AccountSuspendedException,
  AccountPendingException,
  ResourceAlreadyExistsException,
} from '@common/exceptions';
import { AccountStatus } from '@infrastructure/generated/prisma/enums';
import { SALT_ROUNDS } from '@common/constants';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  AuthUser,
} from './dtos/auth.dto';
import { IUserRepository } from '@domain/repository-contracts/user-repository.contract';
import { USER_PRISMA_REPOSITORY } from '../user/infrastructure/repositories/user-prisma.repository';

jest.mock('@common/utils', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

// aliased after jest.mock hoisting so we can control return values in tests
import { randomUUID } from 'crypto';
const mockRandomUuid = randomUUID as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: Record<string, any>;
  let jwtMock: jest.Mock;
  let configMock: { get: jest.Mock };
  let mailMock: { sendVerifyEmail: jest.Mock; sendPasswordResetEmail: jest.Mock };
  let configStore: Record<string, unknown>;

  const UUID_STUB = '11111111-1111-1111-1111-111111111111';

  const buildUser = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-abc-123',
    email: 'test@example.com',
    password: 'existing_hashed_password',
    name: 'Test User',
    status: AccountStatus.ACTIVE,
    roles: [{ role: 'BUYER' }],
    ...overrides,
  });

  const futureDate = (): Date => new Date(Date.now() + 1000 * 60 * 60 * 24);
  const pastDate = (): Date => new Date(Date.now() - 1000 * 60 * 60 * 24);

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userRoleMapping: {
        create: jest.fn(),
      },
      passwordReset: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jwtMock = jest.fn();
    configMock = { get: jest.fn() };
    mailMock = {
      sendVerifyEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    configStore = {
      'jwt.accessSecret': 'access-secret-key',
      'jwt.refreshSecret': 'refresh-secret-key',
      'jwt.accessExpiresInSeconds': 900,
      'jwt.refreshExpiresInSeconds': 604800,
      'app.isProduction': false,
    };
    configMock.get.mockImplementation((key: string) => configStore[key]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jwtMock } },
        { provide: ConfigService, useValue: configMock },
        { provide: MailService, useValue: mailMock },
        { provide: USER_PRISMA_REPOSITORY, useValue: {} as IUserRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();

    (hashPassword as jest.Mock).mockResolvedValue('hashed_pw');
    (comparePassword as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_refresh');
    mockRandomUuid.mockReturnValue(UUID_STUB);
    jwtMock.mockResolvedValue('signed.jwt.token');

    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
  });

  // ========================================================================
  // REGISTER
  // ========================================================================
  describe('register', () => {
    const dto: RegisterDto = {
      email: 'new@example.com',
      password: 'securepass1',
      name: 'New User',
    };

    it('should create user, role mapping, verification token, and send email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: dto.email,
        name: dto.name,
      });
      prisma.userRoleMapping.create.mockResolvedValue({});
      prisma.passwordReset.create.mockResolvedValue({});
      mailMock.sendVerifyEmail.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(hashPassword).toHaveBeenCalledWith(dto.password);
      expect(prisma.$transaction).toHaveBeenCalled();

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          password: 'hashed_pw',
          name: dto.name,
          status: AccountStatus.PENDING,
        },
      });
      expect(prisma.userRoleMapping.create).toHaveBeenCalledWith({
        data: { userId: 'new-user-id', role: 'BUYER' },
      });
      expect(prisma.passwordReset.create).toHaveBeenCalledWith({
        data: {
          userId: 'new-user-id',
          token: `verify_${UUID_STUB}`,
          expiresAt: expect.any(Date),
        },
      });

      expect(mailMock.sendVerifyEmail).toHaveBeenCalledWith(
        dto.email,
        `verify_${UUID_STUB}`,
      );

      expect(result).toEqual({
        user: { id: 'new-user-id', email: dto.email, name: dto.name },
        verificationToken: `verify_${UUID_STUB}`,
      });
    });

    it('should throw ResourceAlreadyExistsException when email is taken', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: dto.email,
      });

      await expect(service.register(dto)).rejects.toThrow(
        ResourceAlreadyExistsException,
      );
      expect(hashPassword).not.toHaveBeenCalled();
      expect(mailMock.sendVerifyEmail).not.toHaveBeenCalled();
    });

    it('should omit verificationToken in production', async () => {
      configStore['app.isProduction'] = true;
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: dto.email,
        name: dto.name,
      });
      prisma.userRoleMapping.create.mockResolvedValue({});
      prisma.passwordReset.create.mockResolvedValue({});
      mailMock.sendVerifyEmail.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(result).toEqual({
        user: { id: 'new-user-id', email: dto.email, name: dto.name },
      });
      expect(result).not.toHaveProperty('verificationToken');
    });
  });

  // ========================================================================
  // LOGIN
  // ========================================================================
  describe('login', () => {
    const dto: LoginDto = {
      email: 'test@example.com',
      password: 'correct-password',
    };

    it('should return tokens and user profile on success', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      (comparePassword as jest.Mock).mockResolvedValue(true);
      prisma.session.create.mockResolvedValue({});

      const result = await service.login(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
        include: { roles: true },
      });
      expect(comparePassword).toHaveBeenCalledWith(
        dto.password,
        'existing_hashed_password',
      );

      expect(jwtMock).toHaveBeenCalledTimes(2);
      expect(jwtMock).toHaveBeenNthCalledWith(
        1,
        {
          sub: 'user-abc-123',
          email: 'test@example.com',
          sessionId: UUID_STUB,
          type: 'access',
        },
        { secret: 'access-secret-key', expiresIn: 900 },
      );
      expect(jwtMock).toHaveBeenNthCalledWith(
        2,
        {
          sub: 'user-abc-123',
          email: 'test@example.com',
          sessionId: UUID_STUB,
          type: 'refresh',
        },
        { secret: 'refresh-secret-key', expiresIn: 604800 },
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('signed.jwt.token', SALT_ROUNDS);

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          id: UUID_STUB,
          userId: 'user-abc-123',
          refreshToken: 'hashed_refresh',
          expiresAt: expect.any(Date),
          userAgent: undefined,
          ipAddress: undefined,
        },
      });

      expect(result).toEqual({
        user: {
          id: 'user-abc-123',
          email: 'test@example.com',
          name: 'Test User',
          roles: ['BUYER'],
        },
        accessToken: 'signed.jwt.token',
        refreshToken: 'signed.jwt.token',
        sessionId: UUID_STUB,
      });
    });

    it('should throw InvalidCredentialsException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw InvalidCredentialsException when user has no password (OAuth)', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ password: null }));

      await expect(service.login(dto)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw AccountSuspendedException when account is suspended', async () => {
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ status: AccountStatus.SUSPENDED }),
      );

      await expect(service.login(dto)).rejects.toThrow(
        AccountSuspendedException,
      );
    });

    it('should throw AccountPendingException when account is pending', async () => {
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ status: AccountStatus.PENDING }),
      );

      await expect(service.login(dto)).rejects.toThrow(
        AccountPendingException,
      );
    });

    it('should throw InvalidCredentialsException when password mismatches', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should store userAgent and ipAddress in session', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      (comparePassword as jest.Mock).mockResolvedValue(true);
      prisma.session.create.mockResolvedValue({});

      await service.login(dto, {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      });

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        }),
      });
    });
  });

  // ========================================================================
  // REFRESH
  // ========================================================================
  describe('refresh', () => {
    const userId = 'user-abc-123';
    const oldSessionId = 'old-session-999';

    it('should revoke old session and issue new token pair', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
      });
      prisma.session.update.mockResolvedValue({});
      prisma.session.create.mockResolvedValue({});

      const result = await service.refresh(userId, oldSessionId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: oldSessionId },
        data: { revokedAt: expect.any(Date) },
      });
      expect(jwtMock).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: 'signed.jwt.token',
        sessionId: UUID_STUB,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh(userId, oldSessionId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ========================================================================
  // LOGOUT
  // ========================================================================
  describe('logout', () => {
    const authUser: AuthUser = {
      id: 'user-abc-123',
      email: 'test@example.com',
      sessionId: 'session-to-end',
      roles: ['BUYER'],
    };

    it('should revoke the given session', async () => {
      prisma.session.update.mockResolvedValue({});

      const result = await service.logout(authUser);

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: authUser.sessionId },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result).toBeUndefined();
    });
  });

  // ========================================================================
  // VERIFY EMAIL
  // ========================================================================
  describe('verifyEmail', () => {
    const dto: VerifyEmailDto = { token: 'verify_valid-token-001' };

    const validTokenRecord = () => ({
      id: 'ptr-001',
      token: 'verify_valid-token-001',
      used: false,
      expiresAt: futureDate(),
      userId: 'user-abc-123',
      user: {
        id: 'user-abc-123',
        status: AccountStatus.PENDING,
      },
    });

    it('should activate user and mark token used', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(validTokenRecord());
      prisma.user.update.mockResolvedValue({});
      prisma.passwordReset.update.mockResolvedValue({});

      const result = await service.verifyEmail(dto);

      expect(prisma.passwordReset.findUnique).toHaveBeenCalledWith({
        where: { token: dto.token },
        include: { user: true },
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-abc-123' },
        data: { status: AccountStatus.ACTIVE },
      });
      expect(prisma.passwordReset.update).toHaveBeenCalledWith({
        where: { id: 'ptr-001' },
        data: { used: true },
      });
      expect(result).toEqual({ message: 'X├íc thß╗▒c email th├ánh c├┤ng' });
    });

    it('should throw BadRequestException when token not found', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token is already used', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        ...validTokenRecord(),
        used: true,
      });

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token lacks verify_ prefix', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        ...validTokenRecord(),
        token: 'reset_valid-token-001',
      });

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token is expired', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        ...validTokenRecord(),
        expiresAt: pastDate(),
      });

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw AccountSuspendedException when user is suspended', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        ...validTokenRecord(),
        user: { id: 'user-abc-123', status: AccountStatus.SUSPENDED },
      });

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        AccountSuspendedException,
      );
    });
  });

  // ========================================================================
  // FORGOT PASSWORD
  // ========================================================================
  describe('forgotPassword', () => {
    const dto: ForgotPasswordDto = { email: 'test@example.com' };

    it('should create reset token and send email', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      prisma.passwordReset.create.mockResolvedValue({});
      mailMock.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(prisma.passwordReset.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-abc-123',
          token: `reset_${UUID_STUB}`,
          expiresAt: expect.any(Date),
        },
      });
      expect(mailMock.sendPasswordResetEmail).toHaveBeenCalledWith(
        dto.email,
        `reset_${UUID_STUB}`,
      );
      expect(result.resetToken).toBe(`reset_${UUID_STUB}`);
    });

    it('should not throw when user not found (vague response)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(dto);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
      expect(prisma.passwordReset.create).not.toHaveBeenCalled();
      expect(mailMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should throw AccountSuspendedException when account is suspended', async () => {
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ status: AccountStatus.SUSPENDED }),
      );

      await expect(service.forgotPassword(dto)).rejects.toThrow(
        AccountSuspendedException,
      );
    });

    it('should omit resetToken in production', async () => {
      configStore['app.isProduction'] = true;
      prisma.user.findUnique.mockResolvedValue(buildUser());
      prisma.passwordReset.create.mockResolvedValue({});
      mailMock.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(dto);

      expect(result).not.toHaveProperty('resetToken');
    });
  });

  // ========================================================================
  // RESET PASSWORD
  // ========================================================================
  describe('resetPassword', () => {
    const dto: ResetPasswordDto = {
      token: 'reset_valid-token-002',
      newPassword: 'brandNewPass1',
    };

    const validTokenRecord = () => ({
      id: 'ptr-002',
      token: 'reset_valid-token-002',
      used: false,
      expiresAt: futureDate(),
      userId: 'user-abc-123',
      user: {
        id: 'user-abc-123',
        status: AccountStatus.ACTIVE,
      },
    });

    it('should hash new password, update user, mark token used, and revoke sessions', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(validTokenRecord());
      prisma.user.update.mockResolvedValue({});
      prisma.passwordReset.update.mockResolvedValue({});
      prisma.session.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.resetPassword(dto);

      expect(hashPassword).toHaveBeenCalledWith(dto.newPassword);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-abc-123' },
        data: { password: 'hashed_pw' },
      });
      expect(prisma.passwordReset.update).toHaveBeenCalledWith({
        where: { id: 'ptr-002' },
        data: { used: true },
      });
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-abc-123', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result).toEqual({ message: '─Éß║╖t lß║íi mß║¡t khß║⌐u th├ánh c├┤ng' });
    });

    it('should throw BadRequestException when token not found', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token is already used', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        ...validTokenRecord(),
        used: true,
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token lacks reset_ prefix', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        ...validTokenRecord(),
        token: 'verify_valid-token-002',
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token is expired', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        ...validTokenRecord(),
        expiresAt: pastDate(),
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw AccountSuspendedException when user is suspended', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        ...validTokenRecord(),
        user: { id: 'user-abc-123', status: AccountStatus.SUSPENDED },
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(
        AccountSuspendedException,
      );
    });
  });

  // ========================================================================
  // CHANGE PASSWORD
  // ========================================================================
  describe('changePassword', () => {
    const authUser: AuthUser = {
      id: 'user-abc-123',
      email: 'test@example.com',
      sessionId: 'current-session-xyz',
      roles: ['BUYER'],
    };

    const dto: ChangePasswordDto = {
      currentPassword: 'old-secret',
      newPassword: 'brandNewSecret1',
    };

    it('should update password and revoke other sessions', async () => {
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ password: 'existing_hash' }),
      );
      (comparePassword as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({});
      prisma.session.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.changePassword(authUser, dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: authUser.id },
      });
      expect(comparePassword).toHaveBeenCalledWith(
        dto.currentPassword,
        'existing_hash',
      );
      expect(hashPassword).toHaveBeenCalledWith(dto.newPassword);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: authUser.id },
        data: { password: 'hashed_pw' },
      });
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: authUser.id,
          revokedAt: null,
          NOT: { id: authUser.sessionId },
        },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result).toEqual({ message: '─Éß╗òi mß║¡t khß║⌐u th├ánh c├┤ng' });
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ password: 'existing_hash' }),
      );
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(authUser, dto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found (or no password)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(authUser, dto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should preserve the current session while revoking others', async () => {
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ password: 'existing_hash' }),
      );
      (comparePassword as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({});
      prisma.session.updateMany.mockResolvedValue({ count: 1 });

      await service.changePassword(authUser, dto);

      expect(prisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: { id: authUser.sessionId },
          }),
        }),
      );
    });
  });

  // ========================================================================
  // UTILITY: getRefreshTokenMaxAgeMs
  // ========================================================================
  describe('getRefreshTokenMaxAgeMs', () => {
    it('should convert seconds to milliseconds', () => {
      configMock.get.mockReturnValue(3600);

      expect(service.getRefreshTokenMaxAgeMs()).toBe(3_600_000);
    });
  });

  // ========================================================================
  // UTILITY: isProduction
  // ========================================================================
  describe('isProduction', () => {
    it('should return false when config is false', () => {
      configMock.get.mockReturnValue(false);
      expect(service.isProduction()).toBe(false);
    });

    it('should return true when config is true', () => {
      configMock.get.mockReturnValue(true);
      expect(service.isProduction()).toBe(true);
    });
  });
});
