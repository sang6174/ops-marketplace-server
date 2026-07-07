// src/modules/product/application/dtos/product.dto.ts
import {
  ProductCategory,
  ProductStatus,
  ProductUnit,
} from '@domain/entities/enums.enum';

export interface CreateProductInput {
  sellerId: string;
  category: ProductCategory;
  unit: ProductUnit;
  name: string;
  description: string;
  retailPrice: number;
  wholesalePrice?: number;
  minWholesaleQuantity?: number;
  images: string[];
  origin: string;
  isSeasonal: boolean;
  seasonStart?: Date;
  seasonEnd?: Date;
  certifications: string[];
}

export interface UpdateProductInfoInput {
  productId: string;
  sellerId: string;
  name?: string;
  description?: string;
  category?: ProductCategory;
  unit?: ProductUnit;
  origin?: string;
}

export interface UpdateProductPriceInput {
  productId: string;
  sellerId: string;
  retailPrice?: number;
  wholesalePrice?: number;
  minWholesaleQuantity?: number;
}

export interface UpdateProductStatusInput {
  productId: string;
  sellerId: string;
  status: ProductStatus;
}

export interface UpdateSeasonalInfoInput {
  productId: string;
  sellerId: string;
  isSeasonal: boolean;
  seasonStart?: Date;
  seasonEnd?: Date;
}

export interface AddCertificationInput {
  productId: string;
  sellerId: string;
  certification: string;
}

export interface RemoveCertificationInput {
  productId: string;
  sellerId: string;
  certification: string;
}

export interface GetProductsInput {
  sellerId?: string;
  category?: ProductCategory;
  status?: ProductStatus;
  isSeasonal?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'retailPrice' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
}

export interface GetProductByIdInput {
  productId: string;
  sellerId?: string;
}

export interface BulkUpdateStatusInput {
  productIds: string[];
  sellerId: string;
  status: ProductStatus;
}

export interface ProductResponse {
  id: string;
  sellerId: string;
  category: ProductCategory;
  status: ProductStatus;
  name: string;
  unit: ProductUnit;
  retailPrice: number;
  wholesalePrice?: number;
  minWholesaleQuantity?: number;
  description: string;
  origin: string;
  isSeasonal: boolean;
  seasonStart?: Date;
  seasonEnd?: Date;
  certifications: string[];
  images: string[];
  isCurrentlyInSeason: boolean;
  hasWholesale: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductListResponse {
  items: ProductResponse[];
  total: number;
  limit: number;
  offset: number;
}
