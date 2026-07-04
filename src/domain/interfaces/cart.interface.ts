export interface ICartItem {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly wholesalePrice?: number; // optional
}

export interface ICart {
  readonly id: string;
  readonly userId: string | null;
  readonly sessionId: string | null;
  readonly items: ICartItem[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly couponCode?: string;
  readonly couponDiscount?: number;
}
