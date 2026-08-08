// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard, RefreshTokenGuard } from './guards';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { MailModule } from '@infrastructure/mail/mail.module';
import {
  UserPrismaRepository,
  USER_PRISMA_REPOSITORY,
} from '../user/infrastructure/repositories/user-prisma.repository';

@Module({
  imports: [PassportModule, JwtModule.register({}), PrismaModule, MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    RefreshTokenGuard,
    UserPrismaRepository,
    { provide: USER_PRISMA_REPOSITORY, useClass: UserPrismaRepository },
  ],
  exports: [AuthService, JwtAuthGuard, RefreshTokenGuard, USER_PRISMA_REPOSITORY],
})
export class AuthModule {}
