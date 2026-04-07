// src/modules/shop/dtos/shop.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SearchPaginationDto } from '@common/dtos/pagination.dto';

export class CreateShopDto {
  @ApiProperty({ example: 'Shop Thời Trang ABC' })
  @IsString()
  @IsNotEmpty({ message: 'Tên shop không được để trống' })
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Chuyên bán thời trang nam nữ...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateShopDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class QueryShopsDto extends SearchPaginationDto {}
