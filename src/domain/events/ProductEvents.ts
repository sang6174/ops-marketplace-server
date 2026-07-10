import { ProductId } from '../value-objects/ProductId';

export class ProductPublishedEvent {
  constructor(public readonly productId: ProductId) {}
}

export class ProductConfirmedEvent {
  constructor(public readonly productId: ProductId) {}
}

export class ProductUnpublishedEvent {
  constructor(public readonly productId: ProductId) {}
}
