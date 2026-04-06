import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'nguyenvana@gmail.com' })
  @IsOptional()
  @IsString()
  email?: string;
}
