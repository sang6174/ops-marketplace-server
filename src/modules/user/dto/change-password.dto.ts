import { IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiPropertyOptional({ example: 'thanhsang' })
  @IsString()
  currentPassword!: string;

  @ApiPropertyOptional({ example: 'thanhsang1234' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
