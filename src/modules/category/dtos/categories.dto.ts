import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ProductStatus } from '@infrastructure/generated/prisma/enums';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Điện Tử' })
  @IsString()
  @IsNotEmpty({ message: 'Name of Category is not empty' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'dien-tu' })
  @IsString()
  @IsNotEmpty({ message: 'slug is not empty' })
  @MaxLength(100)
  slug!: string;

  @ApiProperty({ example: 'uuidv4' })
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class QueryCategoryProductsDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
