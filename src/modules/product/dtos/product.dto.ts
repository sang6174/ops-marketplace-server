import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  IsDecimal,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ProductStatus } from '@infrastructure/generated/prisma/enums';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status!: ProductStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddVariantDto)
  variants?: AddVariantDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class InventoryDto {
  @IsInt()
  @Min(0)
  stock!: number;
}

export class VariantAttributeDto {
  @IsString()
  attributeId!: string;

  @IsString()
  value!: string;
}

export class AddVariantDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsDecimal()
  price!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => InventoryDto)
  inventory?: InventoryDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  attributes?: VariantAttributeDto[];
}

export class UpdateVariantDto extends PartialType(AddVariantDto) {}

export class AdjustInventoryDto {
  @IsInt()
  quantity!: number;
}
