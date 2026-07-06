// domain/entities/product.ts
import { ProductCategory, ProductStatus, ProductUnit } from './enums.enum';

export class Product {
  private constructor(
    public readonly id: string,
    public readonly sellerId: string,
    private _category: ProductCategory,
    private _status: ProductStatus,
    private _name: string,
    private _unit: ProductUnit,
    private _retailPrice: number,
    private _wholesalePrice: number | undefined,
    private _description: string,
    private _minWholesaleQuantity: number | undefined,
    private _origin: string,
    private _isSeasonal: boolean,
    private _seasonStart: Date | undefined,
    private _seasonEnd: Date | undefined,
    private _certifications: string[],
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  get category(): ProductCategory {
    return this._category;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get unit(): ProductUnit {
    return this._unit;
  }

  get retailPrice(): number {
    return this._retailPrice;
  }

  get wholesalePrice(): number | undefined {
    return this._wholesalePrice;
  }

  get minWholesaleQuantity(): number | undefined {
    return this._minWholesaleQuantity;
  }

  get status(): ProductStatus {
    return this._status;
  }

  get isSeasonal(): boolean {
    return this._isSeasonal;
  }

  get seasonStart(): Date | undefined {
    return this._seasonStart;
  }

  get seasonEnd(): Date | undefined {
    return this._seasonEnd;
  }

  get certifications(): string[] {
    return [...this._certifications];
  }

  get origin(): string {
    return this._origin;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  static create(input: {
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
  }): Product {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Product name is required');
    }
    if (input.retailPrice <= 0) {
      throw new Error('Retail price must be greater than 0');
    }
    if (input.wholesalePrice !== undefined && input.wholesalePrice <= 0) {
      throw new Error('Wholesale price must be greater than 0');
    }
    if (
      input.wholesalePrice !== undefined &&
      input.minWholesaleQuantity !== undefined &&
      input.minWholesaleQuantity <= 0
    ) {
      throw new Error('Minimum wholesale quantity must be greater than 0');
    }
    if (input.isSeasonal) {
      if (!input.seasonStart || !input.seasonEnd) {
        throw new Error('Seasonal products must have both start and end dates');
      }
      if (input.seasonStart >= input.seasonEnd) {
        throw new Error('Season start must be before season end');
      }
    }

    return new Product(
      crypto.randomUUID(),
      input.sellerId,
      input.category,
      ProductStatus.DRAFT, // default status
      input.name.trim(),
      input.unit,
      input.retailPrice,
      input.wholesalePrice,
      input.description.trim(),
      input.minWholesaleQuantity,
      input.origin.trim(),
      input.isSeasonal,
      input.seasonStart,
      input.seasonEnd,
      input.certifications,
      new Date(),
      new Date(),
    );
  }

  updateInfo(input: {
    name?: string;
    description?: string;
    category?: ProductCategory;
    unit?: ProductUnit;
    origin?: string;
  }): void {
    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        throw new Error('Product name cannot be empty');
      }
      this._name = input.name.trim();
    }
    if (input.description !== undefined) {
      this._description = input.description.trim();
    }
    if (input.category !== undefined) {
      this._category = input.category;
    }
    if (input.unit !== undefined) {
      this._unit = input.unit;
    }
    if (input.origin !== undefined) {
      if (!input.origin || input.origin.trim().length === 0) {
        throw new Error('Origin cannot be empty');
      }
      this._origin = input.origin.trim();
    }
    this._touch();
  }

  updatePrice(input: {
    retailPrice?: number;
    wholesalePrice?: number;
    minWholesaleQuantity?: number;
  }): void {
    if (input.retailPrice !== undefined) {
      if (input.retailPrice <= 0) {
        throw new Error('Retail price must be greater than 0');
      }
      this._retailPrice = input.retailPrice;
    }
    if (input.wholesalePrice !== undefined) {
      if (input.wholesalePrice <= 0) {
        throw new Error('Wholesale price must be greater than 0');
      }
      this._wholesalePrice = input.wholesalePrice;
    }
    if (input.minWholesaleQuantity !== undefined) {
      if (input.minWholesaleQuantity <= 0) {
        throw new Error('Minimum wholesale quantity must be greater than 0');
      }
      this._minWholesaleQuantity = input.minWholesaleQuantity;
    }
    if (
      this._wholesalePrice !== undefined &&
      this._minWholesaleQuantity === undefined
    ) {
      throw new Error(
        'Minimum wholesale quantity is required when wholesale price is set',
      );
    }
    if (
      this._wholesalePrice === undefined &&
      this._minWholesaleQuantity !== undefined
    ) {
      this._wholesalePrice = Math.ceil(this._retailPrice * 0.9);
    }
    this._touch();
  }

  updateStatus(newStatus: ProductStatus): void {
    if (newStatus === this._status) return;

    switch (newStatus) {
      case ProductStatus.ACTIVE:
        if (!this._retailPrice || this._retailPrice <= 0) {
          throw new Error('Price required');
        }
        this._status = ProductStatus.ACTIVE;
        break;

      case ProductStatus.DISCONTINUED:
        this._status = ProductStatus.DISCONTINUED;
        break;

      case ProductStatus.DRAFT:
        this._status = ProductStatus.DRAFT;
        break;

      case ProductStatus.PENDING:
        this._status = ProductStatus.PENDING;
        break;

      case ProductStatus.OUT_OF_STOCK:
        this._status = ProductStatus.OUT_OF_STOCK;
        break;

      default:
        throw new Error(`Invalid status: ${newStatus as string}`);
    }

    this._touch();
  }

  updateSeasonalInfo(
    isSeasonal: boolean,
    seasonStart?: Date,
    seasonEnd?: Date,
  ): void {
    if (isSeasonal) {
      if (!seasonStart || !seasonEnd) {
        throw new Error('Seasonal products must have both start and end dates');
      }
      if (seasonStart >= seasonEnd) {
        throw new Error('Season start must be before season end');
      }
      this._isSeasonal = true;
      this._seasonStart = seasonStart;
      this._seasonEnd = seasonEnd;
    } else {
      this._isSeasonal = false;
      this._seasonStart = undefined;
      this._seasonEnd = undefined;
    }
    this._touch();
  }

  addCertification(cert: string): void {
    if (!cert || cert.trim().length === 0) {
      throw new Error('Certification cannot be empty');
    }
    const trimmed = cert.trim();
    if (!this._certifications.includes(trimmed)) {
      this._certifications.push(trimmed);
      this._touch();
    }
  }

  removeCertification(cert: string): void {
    const index = this._certifications.indexOf(cert);
    if (index === -1) {
      throw new Error('Certification not found');
    }
    this._certifications.splice(index, 1);
    this._touch();
  }

  isCurrentlyInSeason(date: Date = new Date()): boolean {
    if (!this._isSeasonal || !this._seasonStart || !this._seasonEnd) {
      return false;
    }
    return date >= this._seasonStart && date <= this._seasonEnd;
  }

  hasWholesale(): boolean {
    return this._wholesalePrice !== undefined && this._wholesalePrice > 0;
  }

  isPublishedBySeller(): boolean {
    return this._status === ProductStatus.PENDING;
  }

  publishBySeller(): void {
    this.updateStatus(ProductStatus.PENDING);
  }

  unpublishBySeller(): void {
    this.updateStatus(ProductStatus.DRAFT);
  }

  isConfirmedByAdmin(): boolean {
    return this._status === ProductStatus.ACTIVE;
  }

  confirmByAdmin(): void {
    this.updateStatus(ProductStatus.ACTIVE);
  }

  markAsInStock(): void {
    this.updateStatus(ProductStatus.ACTIVE);
  }

  markAsOutOfStock(): void {
    this.updateStatus(ProductStatus.OUT_OF_STOCK);
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }
}
