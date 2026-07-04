import { ProductCategory, ProductStatus, ProductUnit } from './enums.enum';

export class Product {
  private constructor(
    public readonly id: string,
    public sellerId: string,
    public category: ProductCategory,
    public name: string,
    public description: string,
    public images: string[],
    public unit: ProductUnit,
    public retailPrice: number,
    public status: ProductStatus,
    public isSeasonal: boolean,
    public certifications: string[],
    public origin: string,
    public createdAt: Date,
    public updatedAt: Date,
    public wholesalePrice?: number,
    public minWholesaleQuantity?: number,
    public seasonStart?: Date,
    public seasonEnd?: Date,
  ) {}
}
