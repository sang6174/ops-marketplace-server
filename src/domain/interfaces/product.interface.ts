import {
  ProductCategory,
  ProductStatus,
  ProductUnit,
} from '../entities/enums.enum';

export interface IProduct {
  readonly id: string;
  readonly sellerId: string;
  readonly category: ProductCategory;
  readonly name: string;
  readonly description: string;
  readonly images: string[];
  readonly unit: ProductUnit;
  readonly retailPrice: number;
  readonly status: ProductStatus;
  readonly isSeasonal: boolean;
  readonly certifications: string[];
  readonly origin: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly wholesalePrice?: number;
  readonly minWholesaleQuantity?: number;
  readonly seasonStart?: Date;
  readonly seasonEnd?: Date;
}
