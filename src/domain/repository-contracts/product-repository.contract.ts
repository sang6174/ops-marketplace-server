import { Product } from '@domain/entities/product';
import { ProductCategory, ProductStatus } from '@domain/entities/enums.enum';
import { IBaseRepository } from './base-repository.interface';

export interface IProductRepository extends IBaseRepository<Product> {
  findBySellerId(
    sellerId: string,
    options?: {
      status?: ProductStatus;
      category?: ProductCategory;
      limit?: number;
      offset?: number;
    },
  ): Promise<Product[]>;
  findByCategory(category: ProductCategory): Promise<Product[]>;
  findByStatus(status: ProductStatus): Promise<Product[]>;
  findInSeason(date?: Date): Promise<Product[]>;
  searchByNameOrDescription(query: string): Promise<Product[]>;
  findWithWholesale(): Promise<Product[]>;
  findMany(filters: ProductFilters): Promise<Product[]>;
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
