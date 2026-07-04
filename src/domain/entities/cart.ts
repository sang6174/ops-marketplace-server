export class CartItem {
  constructor(
    public readonly productId: string,
    public quantity: number,
    public unitPrice: number,
    public wholesalePrice?: number,
  ) {}
}

export class Cart {
  private constructor(
    public readonly id: string,
    public userId: string | null,
    public sessionId: string | null,
    public items: CartItem[],
    public createdAt: Date,
    public updatedAt: Date,
    public couponCode?: string,
    public couponDiscount?: number,
  ) {}
}
