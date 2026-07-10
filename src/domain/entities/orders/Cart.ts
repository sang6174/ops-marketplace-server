export class CartItem {
  constructor(
    public readonly shopId: string,
    public readonly productId: string,
    private _quantity: number,
    private _retailPrice: number,
    private _wholesalePrice?: number,
  ) {}

  get quantity(): number {
    return this._quantity;
  }

  get retailPrice(): number {
    return this._retailPrice;
  }

  get wholesalePrice(): number | undefined {
    return this._wholesalePrice;
  }

  getTotalPrice(): number {
    const price = this._wholesalePrice ?? this._retailPrice;
    return price * this._quantity;
  }

  changeQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    this._quantity = newQuantity;
  }

  changeRetailPrice(newPrice: number): void {
    if (newPrice <= 0) {
      throw new Error('Unit price must be greater than 0');
    }
    this._retailPrice = newPrice;
  }

  changeWholesalePrice(newPrice?: number): void {
    if (newPrice !== undefined && newPrice <= 0) {
      throw new Error('Wholesale price must be greater than 0');
    }
    this._wholesalePrice = newPrice;
  }

  getEffectivePrice(): number {
    return this._wholesalePrice ?? this._retailPrice;
  }
}
export class Cart {
  private constructor(
    public readonly id: string,
    private _userId: string | null,
    private _sessionId: string | null,
    private _items: CartItem[],
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {
    if (!_userId && !_sessionId) {
      throw new Error(
        'Cart must be associated with either a user or a session',
      );
    }
  }

  static create(userId?: string, sessionId?: string): Cart {
    return new Cart(
      crypto.randomUUID(),
      userId ?? null,
      sessionId ?? null,
      [],
      new Date(),
      new Date(),
    );
  }

  static reconstitute(props: {
    id: string;
    userId: string | null;
    sessionId: string | null;
    items: CartItem[];
    createdAt: Date;
    updatedAt: Date;
  }): Cart {
    return new Cart(
      props.id,
      props.userId,
      props.sessionId,
      props.items,
      props.createdAt,
      props.updatedAt,
    );
  }

  get userId(): string | null {
    return this._userId;
  }

  get sessionId(): string | null {
    return this._sessionId;
  }

  get items(): CartItem[] {
    return [...this._items];
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  getTotalPrice(): number {
    return this._items.reduce((sum, item) => sum + item.getTotalPrice(), 0);
  }

  getTotalQuantity(): number {
    return this._items.reduce((sum, item) => sum + item.quantity, 0);
  }

  isEmpty(): boolean {
    return this._items.length === 0;
  }

  addItem(
    shopId: string,
    productId: string,
    quantity: number,
    unitPrice: number,
    wholesalePrice?: number,
  ): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    if (unitPrice <= 0) {
      throw new Error('Unit price must be greater than 0');
    }

    const existing = this._items.find((item) => item.productId === productId);
    if (existing) {
      existing.changeQuantity(existing.quantity + quantity);

      if (wholesalePrice !== undefined) {
        existing.changeWholesalePrice(wholesalePrice);
      }
    } else {
      this._items.push(
        new CartItem(shopId, productId, quantity, unitPrice, wholesalePrice),
      );
    }
    this._touch();
  }

  updateItemQuantity(productId: string, newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    const item = this._items.find((item) => item.productId === productId);
    if (!item) {
      throw new Error('Product not found in cart');
    }
    item.changeQuantity(newQuantity);
    this._touch();
  }

  removeItem(productId: string): void {
    const index = this._items.findIndex((item) => item.productId === productId);
    if (index === -1) {
      throw new Error('Product not found in cart');
    }
    this._items.splice(index, 1);
    this._touch();
  }

  clear(): void {
    this._items = [];
    this._touch();
  }

  mergeCart(otherCart: Cart): void {
    for (const item of otherCart.items) {
      this.addItem(
        item.shopId,
        item.productId,
        item.quantity,
        item.retailPrice,
        item.wholesalePrice,
      );
    }
    this._touch();
  }

  assignUser(userId: string): void {
    this._userId = userId;
    this._sessionId = null;
    this._touch();
  }

  refreshPrices(
    productPrices: Record<
      string,
      { unitPrice: number; wholesalePrice?: number }
    >,
  ): void {
    for (const item of this._items) {
      const priceData = productPrices[item.productId];
      if (priceData) {
        if (priceData.unitPrice !== item.retailPrice) {
          item.changeRetailPrice(priceData.unitPrice);
        }
        if (priceData.wholesalePrice !== undefined) {
          item.changeWholesalePrice(priceData.wholesalePrice);
        }
        item.changeWholesalePrice(priceData.wholesalePrice);
      }
    }
    this._touch();
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }
}
