export interface IInventory {
  readonly id: string;
  readonly productId: string;
  readonly quantity: number;
  readonly reservedQuantity: number;
  readonly minStockThreshold: number;
  readonly lastRestockedAt: Date;
  readonly updatedAt: Date;
}
