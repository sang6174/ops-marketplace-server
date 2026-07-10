import { ProductId } from '../../value-objects/ProductId';
import { ProductName } from '../../value-objects/ProductName';
import { ProductDescription } from '../../value-objects/ProductDescription';
import { ProductOrigin } from '../../value-objects/ProductOrigin';
import { ProductPrice } from '../../value-objects/ProductPrice';
import { WholesaleInfo } from '../../value-objects/WholesaleInfo';
import { ProductSeason } from '../../value-objects/ProductSeason';
import { ProductCertification } from '../../value-objects/ProductCertification';
import { ProductCertifications } from '../../value-objects/ProductCertifications';
import { ProductCategory, ProductUnit, ProductStatus } from '../enums.enum';
import {
  ProductState,
  DraftState,
  PendingState,
  ActiveState,
  OutOfStockState,
  DiscontinuedState,
} from '../../state/ProductState';

export class Product {
  private _state: ProductState;

  private constructor(
    public readonly id: ProductId,
    public readonly sellerId: string, // có thể là UserId
    public readonly shopId: string,
    private _category: ProductCategory,
    private _name: ProductName,
    private _unit: ProductUnit,
    private _description: ProductDescription,
    private _retailPrice: ProductPrice,
    private _wholesaleInfo: WholesaleInfo | null,
    private _origin: ProductOrigin,
    private _season: ProductSeason | null,
    private _certifications: ProductCertifications,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    initialState?: ProductState,
  ) {
    this._state = initialState || new DraftState();
  }

  static create(props: {
    id: ProductId;
    sellerId: string;
    shopId: string;
    category: ProductCategory;
    unit: ProductUnit;
    name: ProductName;
    description: ProductDescription;
    retailPrice: ProductPrice;
    wholesaleInfo?: WholesaleInfo | null;
    origin: ProductOrigin;
    season?: ProductSeason | null;
    certifications?: ProductCertification[];
    createdAt?: Date;
  }): Product {
    const now = props.createdAt || new Date(); // vẫn cần, nhưng sẽ được DI
    return new Product(
      props.id,
      props.sellerId,
      props.shopId,
      props.category,
      props.name,
      props.unit,
      props.description,
      props.retailPrice,
      props.wholesaleInfo ?? null,
      props.origin,
      props.season ?? null,
      ProductCertifications.create(props.certifications ?? []),
      now,
      now,
      new DraftState(),
    );
  }

  static reconstitute(props: {
    id: ProductId;
    sellerId: string;
    shopId: string;
    category: ProductCategory;
    unit: ProductUnit;
    name: ProductName;
    description: ProductDescription;
    retailPrice: ProductPrice;
    wholesaleInfo: WholesaleInfo | null;
    origin: ProductOrigin;
    season: ProductSeason | null;
    certifications: ProductCertifications;
    createdAt: Date;
    updatedAt: Date;
    status: ProductStatus;
  }): Product {
    const state = Product.createStateFromStatus(props.status);
    return new Product(
      props.id,
      props.sellerId,
      props.shopId,
      props.category,
      props.name,
      props.unit,
      props.description,
      props.retailPrice,
      props.wholesaleInfo,
      props.origin,
      props.season,
      props.certifications,
      props.createdAt,
      props.updatedAt,
      state,
    );
  }

  private static createStateFromStatus(status: ProductStatus): ProductState {
    switch (status) {
      case ProductStatus.DRAFT:
        return new DraftState();
      case ProductStatus.PENDING:
        return new PendingState();
      case ProductStatus.ACTIVE:
        return new ActiveState();
      case ProductStatus.OUT_OF_STOCK:
        return new OutOfStockState();
      case ProductStatus.DISCONTINUED:
        return new DiscontinuedState();
      default:
        throw new Error(`Unknown status: ${status}`);
    }
  }

  get category(): ProductCategory {
    return this._category;
  }
  get name(): ProductName {
    return this._name;
  }
  get description(): ProductDescription {
    return this._description;
  }
  get unit(): ProductUnit {
    return this._unit;
  }
  get retailPrice(): ProductPrice {
    return this._retailPrice;
  }
  get wholesaleInfo(): WholesaleInfo | null {
    return this._wholesaleInfo;
  }
  get origin(): ProductOrigin {
    return this._origin;
  }
  get season(): ProductSeason | null {
    return this._season;
  }
  get certifications(): ProductCertifications {
    return this._certifications;
  }
  get status(): ProductStatus {
    return this._state.status;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateInfo(input: {
    name?: ProductName;
    description?: ProductDescription;
    category?: ProductCategory;
    unit?: ProductUnit;
    origin?: ProductOrigin;
  }): void {
    if (input.name !== undefined) this._name = input.name;
    if (input.description !== undefined) this._description = input.description;
    if (input.category !== undefined) this._category = input.category;
    if (input.unit !== undefined) this._unit = input.unit;
    if (input.origin !== undefined) this._origin = input.origin;
    this._touch();
  }

  updatePricing(input: {
    retailPrice?: ProductPrice;
    wholesaleInfo?: WholesaleInfo | null;
  }): void {
    if (input.retailPrice !== undefined) this._retailPrice = input.retailPrice;
    if (input.wholesaleInfo !== undefined) {
      this._wholesaleInfo = input.wholesaleInfo;
    }
    if (this._wholesaleInfo) {
      if (
        this._wholesaleInfo.wholesalePrice.amount >= this._retailPrice.amount
      ) {
        throw new Error('Wholesale price must be less than retail price');
      }
    }
    this._touch();
  }

  updateSeason(season: ProductSeason | null): void {
    this._season = season;
    this._touch();
  }

  addCertification(cert: ProductCertification): void {
    this._certifications = this._certifications.add(cert);
    this._touch();
  }

  removeCertification(cert: ProductCertification): void {
    this._certifications = this._certifications.remove(cert);
    this._touch();
  }

  publish(): void {
    this._state.publish(this);
    this._touch();
  }

  confirmByAdmin(): void {
    this._state.confirm(this);
    this._touch();
  }

  markOutOfStock(): void {
    this._state.markOutOfStock(this);
    this._touch();
  }

  markInStock(): void {
    this._state.markInStock(this);
    this._touch();
  }

  unpublish(): void {
    this._state.unpublish(this);
    this._touch();
  }

  setState(state: ProductState): void {
    this._state = state;
  }

  isInSeason(date: Date = new Date()): boolean {
    return this._season !== null && this._season.isInSeason(date);
  }

  hasWholesale(): boolean {
    return this._wholesaleInfo !== null;
  }

  private _touch(): void {
    this._updatedAt = new Date(); // vẫn dùng new Date, nhưng có thể inject
  }
}
