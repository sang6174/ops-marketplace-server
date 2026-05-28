// src/modules/shop/dtos/shop.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SearchPaginationDto } from '@common/dtos/pagination.dto';
import { ProductStatus } from '@infrastructure/generated/prisma/enums';

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
  @ApiPropertyOptional({ example: 'Shop Thời Trang BCD' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Chuyên bán thời trang nam nữ...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class QueryShopsDto extends SearchPaginationDto {}

export class QueryShopProductsDto extends SearchPaginationDto {
  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
