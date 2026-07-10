import { InventoryId } from '../value-objects/InventoryId';
import { Quantity } from '../value-objects/Quantity';
import { ProductId } from '../value-objects/ProductId';

export abstract class InventoryEvent {
  constructor(
    public readonly inventoryId: InventoryId,
    public readonly productId: ProductId,
    public readonly timestamp: Date,
  ) {}
}

export class StockRestocked extends InventoryEvent {
  constructor(
    inventoryId: InventoryId,
    productId: ProductId,
    public readonly quantity: Quantity,
    public readonly newTotal: Quantity,
    timestamp: Date,
  ) {
    super(inventoryId, productId, timestamp);
  }
}

export class StockReserved extends InventoryEvent {
  constructor(
    inventoryId: InventoryId,
    productId: ProductId,
    public readonly quantity: Quantity,
    public readonly newReserved: Quantity,
    timestamp: Date,
  ) {
    super(inventoryId, productId, timestamp);
  }
}

export class StockUnreserved extends InventoryEvent {
  constructor(
    inventoryId: InventoryId,
    productId: ProductId,
    public readonly quantity: Quantity,
    public readonly newReserved: Quantity,
    timestamp: Date,
  ) {
    super(inventoryId, productId, timestamp);
  }
}

export class StockReduced extends InventoryEvent {
  constructor(
    inventoryId: InventoryId,
    productId: ProductId,
    public readonly quantity: Quantity,
    public readonly newTotal: Quantity,
    timestamp: Date,
  ) {
    super(inventoryId, productId, timestamp);
  }
}

export class MinThresholdChanged extends InventoryEvent {
  constructor(
    inventoryId: InventoryId,
    productId: ProductId,
    public readonly oldThreshold: number,
    public readonly newThreshold: number,
    timestamp: Date,
  ) {
    super(inventoryId, productId, timestamp);
  }
}
