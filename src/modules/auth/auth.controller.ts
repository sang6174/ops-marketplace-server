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
import { RegisterDto, LoginDto, AuthUser } from './dtos/auth.dto';
import { JwtAuthGuard, RefreshTokenGuard } from './guards';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ===== POST /auth/register =====
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  async register(@Body() dto: RegisterDto) {
    console.log(dto);
    return this.authService.register(dto);
  }

  // ===== POST /auth/login =====
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: parseInt(process.env.JWT_REFRESH_EXPIRES_IN_SECONDS!),
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
      sessionId: result.sessionId,
    };
  }

  // ===== POST /auth/refresh =====
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, sessionId } = req.user as {
      userId: string;
      sessionId: string;
    };

    const result = await this.authService.refresh(userId, sessionId);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: parseInt(process.env.JWT_REFRESH_EXPIRES_IN_SECONDS!),
    });

    return {
      accessToken: result.accessToken,
      sessionId: result.sessionId,
    };
  }

  // ===== POST /auth/logout =====
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất' })
  async logout(
    @GetUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(user);
    this.authService.logout(user);

    res.cookie('refreshToken', '');

    return result;
  }
}
