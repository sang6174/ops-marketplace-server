import { Product } from '../entities/products/Product';

export interface ProductValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ProductPriceValidationResult {
  valid: boolean;
  errors: string[];
}

export interface IProductDomainService {
  validateProductForCreation(input: {
    name: string;
    retailPrice: number;
    wholesalePrice?: number;
    minWholesaleQuantity?: number;
    isSeasonal: boolean;
    seasonStart?: Date;
    seasonEnd?: Date;
  }): ProductValidationResult;
  validateProductForUpdate(product: Product): ProductValidationResult;
  validateProductPrices(
    retailPrice: number,
    wholesalePrice?: number,
    minWholesaleQuantity?: number,
  ): ProductPriceValidationResult;

  canActivateProduct(product: Product): boolean;
  canDeleteProduct(product: Product): boolean;
  isProductInSeason(product: Product, date?: Date): boolean;
  hasWholesalePrice(product: Product): boolean;
  checkStockAvailability(
    productId: string,
    quantity: number,
  ): Promise<{ available: boolean; message?: string }>;
  deduplicateCertifications(certifications: string[]): string[];
}
