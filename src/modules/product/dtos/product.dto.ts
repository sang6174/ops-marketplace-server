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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { ProductStatus } from '@infrastructure/generated/prisma/enums';

// ================= PRODUCT =================

export class CreateProductDto {
  @ApiProperty({
    example: 'Áo dài',
    description: 'Product name',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'ao-dai',
    description: 'Slug used for URLs (unique)',
  })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({
    example: 'Áo dài được thiết kế bởi nhà tạo mẫu Nguyễn Hà Nam',
    description: 'Product description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'DRAFT',
    enum: ProductStatus,
    description: 'Product status',
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status!: ProductStatus;

  @ApiPropertyOptional({
    example: false,
    description: 'Featured products',
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    example: ['uuid-category-1', 'uuid-category-2'],
    description: 'List of categoryId (many-to-many)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    type: () => [AddVariantDto],
    description: 'List of product variants',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddVariantDto)
  variants?: AddVariantDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

// ================= INVENTORY =================

export class InventoryDto {
  @ApiProperty({
    example: 100,
    description: 'Inventory level',
  })
  @IsInt()
  @Min(0)
  stock!: number;
}

// ================= VARIANT ATTRIBUTE =================

export class VariantAttributeDto {
  @ApiProperty({
    example: 'color',
    description: 'ID of the attribute (color, size, ...)',
  })
  @IsString()
  attributeId!: string;

  @ApiProperty({
    example: 'red',
    description: 'The value of the attribute',
  })
  @IsString()
  value!: string;
}

// ================= VARIANT =================

export class AddVariantDto {
  @ApiProperty({
    example: 'SKU-001',
    description: 'SKU code of the variant',
  })
  @IsString()
  sku!: string;

  @ApiProperty({
    example: 'Áo dài đỏ size M',
    description: 'Product variant name',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: '199000',
    description: 'Price (decimal in string format)',
  })
  @IsDecimal()
  price!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Default variant of a product',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Is Variant active?',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: () => InventoryDto,
    description: 'Inventory information',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InventoryDto)
  inventory?: InventoryDto;

  @ApiPropertyOptional({
    type: () => [VariantAttributeDto],
    description: 'List of attributes (color, size...)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  attributes?: VariantAttributeDto[];
}

export class UpdateVariantDto extends PartialType(AddVariantDto) {}

// ================= INVENTORY ADJUST =================

export class AdjustInventoryDto {
  @ApiProperty({
    example: 10,
    description: 'The number changes (it can be positive or negative).',
  })
  @IsInt()
  quantity!: number;
}
