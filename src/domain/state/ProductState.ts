// domain/state/ProductState.ts
import { ProductStatus } from '../entities/enums.enum';
import { Product } from '../entities/products/Product';

// Interface cho State
export interface ProductState {
  get status(): ProductStatus;
  canPublish(): boolean;
  canConfirm(): boolean;
  canMarkOutOfStock(): boolean;
  canMarkInStock(): boolean;
  canUnpublish(): boolean;
  publish(product: Product): void;
  confirm(product: Product): void;
  markOutOfStock(product: Product): void;
  markInStock(product: Product): void;
  unpublish(product: Product): void;
}

export abstract class BaseProductState implements ProductState {
  abstract get status(): ProductStatus;

  canPublish(): boolean {
    return this.status === ProductStatus.DRAFT;
  }

  canConfirm(): boolean {
    return this.status === ProductStatus.PENDING;
  }

  canMarkOutOfStock(): boolean {
    return this.status === ProductStatus.ACTIVE;
  }

  canMarkInStock(): boolean {
    return this.status === ProductStatus.OUT_OF_STOCK;
  }

  canUnpublish(): boolean {
    return (
      this.status === ProductStatus.PENDING ||
      this.status === ProductStatus.ACTIVE
    );
  }

  publish(product: Product): void {
    if (!this.canPublish())
      throw new Error(`Cannot publish from state ${this.status}`);
    product.setState(new PendingState());
  }

  confirm(product: Product): void {
    if (!this.canConfirm())
      throw new Error(`Cannot confirm from state ${this.status}`);
    product.setState(new ActiveState());
  }

  markOutOfStock(product: Product): void {
    if (!this.canMarkOutOfStock())
      throw new Error(`Cannot mark out of stock from state ${this.status}`);
    product.setState(new OutOfStockState());
  }

  markInStock(product: Product): void {
    if (!this.canMarkInStock())
      throw new Error(`Cannot mark in stock from state ${this.status}`);
    product.setState(new ActiveState());
  }

  unpublish(product: Product): void {
    if (!this.canUnpublish())
      throw new Error(`Cannot unpublish from state ${this.status}`);
    product.setState(new DraftState());
  }
}

// Concrete States
export class DraftState extends BaseProductState {
  get status(): ProductStatus {
    return ProductStatus.DRAFT;
  }
}

export class PendingState extends BaseProductState {
  get status(): ProductStatus {
    return ProductStatus.PENDING;
  }
}

export class ActiveState extends BaseProductState {
  get status(): ProductStatus {
    return ProductStatus.ACTIVE;
  }
}

export class OutOfStockState extends BaseProductState {
  get status(): ProductStatus {
    return ProductStatus.OUT_OF_STOCK;
  }
}

export class DiscontinuedState extends BaseProductState {
  get status(): ProductStatus {
    return ProductStatus.DISCONTINUED;
  }

  override canPublish(): boolean {
    return false;
  }
  override canConfirm(): boolean {
    return false;
  }
  override canMarkOutOfStock(): boolean {
    return false;
  }
  override canMarkInStock(): boolean {
    return false;
  }
  override canUnpublish(): boolean {
    return false;
  }

  override publish(product: Product): void {
    throw new Error('Discontinued product cannot be published');
  }
  override confirm(product: Product): void {
    throw new Error('Discontinued product cannot be confirmed');
  }
  override markOutOfStock(product: Product): void {
    throw new Error('Discontinued product cannot be marked out of stock');
  }
  override markInStock(product: Product): void {
    throw new Error('Discontinued product cannot be marked in stock');
  }
  override unpublish(product: Product): void {
    throw new Error('Discontinued product cannot be unpublished');
  }
}
