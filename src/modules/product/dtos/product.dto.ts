// DTOs for NestJS controller/service layer
import { ProductStatus } from '@infrastructure/generated/prisma/enums';

export interface QueryProductsDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  shopId?: string;
  categoryId?: string;
  featuredOnly?: boolean;
}

export interface CreateProductDto {
  name: string;
  slug: string;
  description?: string;
  categoryIds?: string[];
}

export interface SellerUpdateProductDto {
  name?: string;
  slug?: string;
  description?: string;
  categoryIds?: string[];
}

export interface CreateProductImageDto {
  url: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface SetInventoryDto {
  stock: number;
}

export interface BulkUpdateInventoryDto {
  items: { productId: string; stock: number }[];
}
