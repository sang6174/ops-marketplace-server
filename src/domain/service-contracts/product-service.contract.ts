// domain/use-case-contracts/product.use-cases.ts
import { Product } from '@domain/entities/product';
import {
  ProductCategory,
  ProductStatus,
  ProductUnit,
} from '@domain/entities/enums.enum';

export interface CreateProductInput {
  sellerId: string;
  category: ProductCategory;
  name: string;
  description: string;
  images: string[];
  unit: ProductUnit;
  retailPrice: number;
  wholesalePrice?: number;
  minWholesaleQuantity?: number;
  isSeasonal: boolean;
  seasonStart?: Date;
  seasonEnd?: Date;
  certifications: string[];
  origin: string;
}

export interface UpdateProductInput {
  category?: ProductCategory;
  name?: string;
  description?: string;
  images?: string[];
  unit?: ProductUnit;
  retailPrice?: number;
  wholesalePrice?: number;
  minWholesaleQuantity?: number;
  isSeasonal?: boolean;
  seasonStart?: Date;
  seasonEnd?: Date;
  certifications?: string[];
  origin?: string;
  status?: ProductStatus;
}

export interface UpdateProductPriceInput {
  retailPrice?: number;
  wholesalePrice?: number;
  minWholesaleQuantity?: number;
}

export interface UpdateProductStatusInput {
  status: ProductStatus;
}

export interface ProductFilters {
  sellerId?: string;
  category?: ProductCategory;
  status?: ProductStatus;
  isSeasonal?: boolean;
  minPrice?: number;
  maxPrice?: number;
  hasWholesale?: boolean;
  origins?: string[];
  certifications?: string[];
}

export interface ICreateProductUseCase {
  execute(input: CreateProductInput): Promise<Product>;
}

export interface IUpdateProductUseCase {
  execute(id: string, input: UpdateProductInput): Promise<Product>;
}

export interface IUpdateProductPriceUseCase {
  execute(id: string, input: UpdateProductPriceInput): Promise<Product>;
}

export interface IUpdateProductStatusUseCase {
  execute(id: string, input: UpdateProductStatusInput): Promise<Product>;
}

export interface IGetProductByIdUseCase {
  execute(id: string): Promise<Product | null>;
}

export interface IGetProductsBySellerUseCase {
  execute(sellerId: string): Promise<Product[]>;
}

export interface IGetProductsByCategoryUseCase {
  execute(category: ProductCategory): Promise<Product[]>;
}

export interface IGetProductsByStatusUseCase {
  execute(status: ProductStatus): Promise<Product[]>;
}

export interface IGetProductsInSeasonUseCase {
  execute(date?: Date): Promise<Product[]>;
}

export interface ISearchProductsUseCase {
  execute(query: string): Promise<Product[]>;
}

export interface IGetProductsWithFiltersUseCase {
  execute(filters: ProductFilters): Promise<Product[]>;
}

export interface IDeleteProductUseCase {
  execute(id: string): Promise<void>;
}

export interface IProductOwnershipUseCase {
  execute(productId: string, sellerId: string): Promise<boolean>;
}
