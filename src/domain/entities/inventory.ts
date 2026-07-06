// domain/entities/inventory.ts

export class Inventory {
  private constructor(
    public readonly id: string,
    public readonly productId: string,
    private _quantity: number,
    private _reservedQuantity: number,
    private _minStockThreshold: number,
    private _lastRestockedAt: Date,
    private _updatedAt: Date,
  ) {}

  get quantity(): number {
    return this._quantity;
  }

  get reservedQuantity(): number {
    return this._reservedQuantity;
  }

  get minStockThreshold(): number {
    return this._minStockThreshold;
  }

  get lastRestockedAt(): Date {
    return this._lastRestockedAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  static create(productId: string, minStockThreshold: number = 10): Inventory {
    return new Inventory(
      crypto.randomUUID(),
      productId,
      0,
      0,
      minStockThreshold,
      new Date(),
      new Date(),
    );
  }

  restock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Restock quantity must be greater than 0');
    }
    this._quantity += quantity;
    this._lastRestockedAt = new Date();
    this._updatedAt = new Date();
  }

  outbound(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Outbound quantity must be greater than 0');
    }
    const available = this._quantity - this._reservedQuantity;
    if (available < quantity) {
      throw new Error(
        `Not enough available stock. Available: ${available}, Requested: ${quantity}`,
      );
    }
    this._quantity -= quantity;
    if (this._reservedQuantity > 0) {
      const reduceReserved = Math.min(this._reservedQuantity, quantity);
      this._reservedQuantity -= reduceReserved;
    }
    this._updatedAt = new Date();
  }

  reserve(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Reserve quantity must be greater than 0');
    }
    const available = this._quantity - this._reservedQuantity;
    if (available < quantity) {
      throw new Error(
        `Not enough stock to reserve. Available: ${available}, Requested: ${quantity}`,
      );
    }
    this._reservedQuantity += quantity;
    this._updatedAt = new Date();
  }

  unreserve(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Unreserve quantity must be greater than 0');
    }
    if (quantity > this._reservedQuantity) {
      throw new Error(
        `Cannot unreserve more than reserved. Reserved: ${this._reservedQuantity}, Requested: ${quantity}`,
      );
    }
    this._reservedQuantity -= quantity;
    this._updatedAt = new Date();
  }

  updateMinStockThreshold(threshold: number): void {
    if (threshold < 0) {
      throw new Error('Min stock threshold cannot be negative');
    }
    this._minStockThreshold = threshold;
    this._updatedAt = new Date();
  }

  isLowStock(thresholdPercent: number = 100): boolean {
    return this._quantity < (this._minStockThreshold * thresholdPercent) / 100;
  }

  getAvailableQuantity(): number {
    return this._quantity - this._reservedQuantity;
  }

  updateLastRestockedAt(date: Date): void {
    this._lastRestockedAt = date;
    this._updatedAt = new Date();
  }
}
