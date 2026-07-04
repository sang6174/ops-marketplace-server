export class Inventory {
  private constructor(
    public readonly id: string,
    public productId: string,
    public quantity: number,
    public reservedQuantity: number,
    public minStockThreshold: number,
    public lastRestockedAt: Date,
    public updatedAt: Date,
  ) {}
}
