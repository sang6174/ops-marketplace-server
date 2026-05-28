import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { Public, GetUser } from '@common/decorators';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  AuthUser,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dtos/auth.dto';
import { JwtAuthGuard, RefreshTokenGuard } from './guards';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookies(
    res: Response,
    refreshToken: string,
    sessionId: string,
  ) {
    const maxAge = this.authService.getRefreshTokenMaxAgeMs();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.authService.isProduction(),
      sameSite: 'strict',
      maxAge,
    });

    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: this.authService.isProduction(),
      sameSite: 'strict',
      maxAge,
    });
  }

  private clearRefreshCookies(res: Response) {
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: this.authService.isProduction(),
      sameSite: 'strict',
      maxAge: 0,
    });

    res.cookie('sessionId', '', {
      httpOnly: true,
      secure: this.authService.isProduction(),
      sameSite: 'strict',
      maxAge: 0,
    });
  }

  // ===== POST /auth/register =====
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ===== POST /auth/login =====
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log in to user's account" })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    this.setRefreshCookies(res, result.refreshToken, result.sessionId);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  // ===== POST /auth/refresh =====
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, sessionId } = req.user as {
      userId: string;
      sessionId: string;
    };

    const result = await this.authService.refresh(userId, sessionId);

    this.setRefreshCookies(res, result.refreshToken, result.sessionId);

    return {
      accessToken: result.accessToken,
    };
  }

  // ===== POST /auth/logout =====
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Log out of user's account" })
  async logout(
    @GetUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(user);
    this.clearRefreshCookies(res);

    return result;
  }

  // ===== POST /auth/verify-email =====
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  // ===== POST /auth/forgot-password =====
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset token' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // ===== POST /auth/reset-password =====
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ===== POST /auth/change-password =====
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change password for authenticated user' })
  changePassword(@GetUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }
}
