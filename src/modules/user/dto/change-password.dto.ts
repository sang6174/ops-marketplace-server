import { IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiPropertyOptional()
  @IsString()
  currentPassword!: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
