// src/modules/auth/dtos/auth.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export class RegisterDto {
  @ApiProperty({ example: 'thanhsang@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty({ example: 'thanhsang' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password!: string;

  @ApiPropertyOptional({ example: 'Lê Thanh Sang' })
  @IsOptional()
  @IsString()
  name!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'thanhsang@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty({ example: 'thanhsang' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

// ===== JWT Payload =====
export interface JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  type: TokenType;
}

// ===== AuthUser =====
export interface AuthUser {
  id: string;
  email: string;
  sessionId: string;
  roles: string[];
}

// ===== Token Pair =====
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}
