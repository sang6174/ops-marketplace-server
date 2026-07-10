import { InventoryId } from '../../value-objects/InventoryId';
import { ProductId } from '../../value-objects/ProductId';
import { Quantity } from '../../value-objects/Quantity';
import { MinStockThreshold } from '../../value-objects/MinStockThreshold';
import {
  StockRestocked,
  StockReserved,
  StockUnreserved,
  StockReduced,
  MinThresholdChanged,
} from '../../events/InventoryEvents';

export class Inventory {
  private _events: any[] = [];

  private constructor(
    public readonly id: InventoryId,
    public readonly productId: ProductId,
    private _quantity: Quantity,
    private _reserved: Quantity,
    private _minThreshold: MinStockThreshold,
    private _lastRestockedAt: Date,
    private _updatedAt: Date,
  ) {}

  // ===== Factory Methods =====
  static create(props: {
    id: InventoryId;
    productId: ProductId;
    minThreshold?: MinStockThreshold;
    initialQuantity?: Quantity;
    createdAt?: Date;
  }): Inventory {
    const now = props.createdAt || new Date();
    const quantity = props.initialQuantity ?? Quantity.zero();
    const reserved = Quantity.zero();
    const threshold = props.minThreshold ?? MinStockThreshold.fromNumber(10);
    return new Inventory(
      props.id,
      props.productId,
      quantity,
      reserved,
      threshold,
      now,
      now,
    );
  }

  static reconstitute(props: {
    id: InventoryId;
    productId: ProductId;
    quantity: Quantity;
    reserved: Quantity;
    minThreshold: MinStockThreshold;
    lastRestockedAt: Date;
    updatedAt: Date;
  }): Inventory {
    return new Inventory(
      props.id,
      props.productId,
      props.quantity,
      props.reserved,
      props.minThreshold,
      props.lastRestockedAt,
      props.updatedAt,
    );
  }

  // ===== Getters =====
  get quantity(): Quantity {
    return this._quantity;
  }
  get reserved(): Quantity {
    return this._reserved;
  }
  get minStockThreshold(): MinStockThreshold {
    return this._minThreshold;
  }
  get lastRestockedAt(): Date {
    return this._lastRestockedAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get events(): any[] {
    return [...this._events];
  }

  restock(quantity: Quantity, timestamp: Date = new Date()): void {
    if (quantity.value <= 0) {
      throw new Error('Restock quantity must be > 0');
    }
    this._quantity = this._quantity.add(quantity);
    this._lastRestockedAt = timestamp;
    this._touch(timestamp);
    this.addEvent(
      new StockRestocked(
        this.id,
        this.productId,
        quantity,
        this._quantity,
        timestamp,
      ),
    );
  }

  outbound(quantity: Quantity, timestamp: Date = new Date()): void {
    if (quantity.value <= 0) {
      throw new Error('Outbound quantity must be > 0');
    }
    const available = this._quantity.value - this._reserved.value;
    if (available < quantity.value) {
      throw new Error(
        `Not enough available stock. Available: ${available}, Requested: ${quantity.value}`,
      );
    }
    this._quantity = this._quantity.subtract(quantity);
    // Reduce reserved first if possible
    const reserveToReduce = Math.min(this._reserved.value, quantity.value);
    if (reserveToReduce > 0) {
      this._reserved = this._reserved.subtract(
        Quantity.fromNumber(reserveToReduce),
      );
    }
    this._touch(timestamp);
    this.addEvent(
      new StockReduced(
        this.id,
        this.productId,
        quantity,
        this._quantity,
        timestamp,
      ),
    );
  }

  reserve(quantity: Quantity, timestamp: Date = new Date()): void {
    if (quantity.value <= 0) {
      throw new Error('Reserve quantity must be > 0');
    }
    const available = this._quantity.value - this._reserved.value;
    if (available < quantity.value) {
      throw new Error(
        `Not enough stock to reserve. Available: ${available}, Requested: ${quantity.value}`,
      );
    }
    this._reserved = this._reserved.add(quantity);
    this._touch(timestamp);
    this.addEvent(
      new StockReserved(
        this.id,
        this.productId,
        quantity,
        this._reserved,
        timestamp,
      ),
    );
  }

  unreserve(quantity: Quantity, timestamp: Date = new Date()): void {
    if (quantity.value <= 0) {
      throw new Error('Unreserve quantity must be > 0');
    }
    if (quantity.value > this._reserved.value) {
      throw new Error(
        `Cannot unreserve more than reserved. Reserved: ${this._reserved.value}, Requested: ${quantity.value}`,
      );
    }
    this._reserved = this._reserved.subtract(quantity);
    this._touch(timestamp);
    this.addEvent(
      new StockUnreserved(
        this.id,
        this.productId,
        quantity,
        this._reserved,
        timestamp,
      ),
    );
  }

  updateMinThreshold(
    newThreshold: MinStockThreshold,
    timestamp: Date = new Date(),
  ): void {
    const old = this._minThreshold;
    this._minThreshold = newThreshold;
    this._touch(timestamp);
    this.addEvent(
      new MinThresholdChanged(
        this.id,
        this.productId,
        old.value,
        newThreshold.value,
        timestamp,
      ),
    );
  }

  getAvailableQuantity(): number {
    return this._quantity.value - this._reserved.value;
  }

  checkLowStock(spec: {
    isSatisfiedBy(inventory: Inventory): boolean;
  }): boolean {
    return spec.isSatisfiedBy(this);
  }

  private _touch(timestamp: Date): void {
    this._updatedAt = timestamp;
  }

  private addEvent(event: any): void {
    this._events.push(event);
  }

  clearEvents(): void {
    this._events = [];
  }

  equals(other: Inventory): boolean {
    return this.id.equals(other.id);
  }
}
