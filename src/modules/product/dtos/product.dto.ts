import {
  IsArray,
  IsBoolean,
  IsIn,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  IsDecimal,
  IsInt,
  IsNotEmpty,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OmitType, PartialType } from '@nestjs/mapped-types';
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

export class SellerUpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['status', 'isFeatured'] as const),
) {}

export class QueryProductsDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ enum: ['createdAt', 'name', 'price'] })
  @IsOptional()
  @IsIn(['createdAt', 'name', 'price'])
  sortBy?: 'createdAt' | 'name' | 'price';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

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
    example: 'uuid-attribute-value',
    description: 'ID of the selected attribute value',
  })
  @IsString()
  attributeValueId!: string;
}

// ================= VARIANT =================

export class AddVariantDto {
  @ApiPropertyOptional({
    example: 'uuid-product',
    description: 'Required when creating a variant via /seller/variants',
  })
  @IsOptional()
  @IsString()
  productId?: string;

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

export class SetInventoryDto {
  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  stock!: number;
}

export class BulkInventoryItemDto extends SetInventoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variantId!: string;
}

export class BulkUpdateInventoryDto {
  @ApiProperty({ type: [BulkInventoryItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkInventoryItemDto)
  items!: BulkInventoryItemDto[];
}

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://example.com/product.jpg' })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateVariantImageDto {
  @ApiProperty({ example: 'https://example.com/variant.jpg' })
  @IsUrl()
  url!: string;
}
