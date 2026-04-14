import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Lê Thanh Sang' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'thanhsang1234@gmail.com' })
  @IsOptional()
  @IsString()
  email?: string;
}
