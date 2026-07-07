export interface GetCartInput {
  userId?: string;
  sessionId?: string;
}

export interface AddItemToCartInput {
  userId?: string;
  sessionId?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  wholesalePrice?: number;
}

export interface UpdateCartItemInput {
  userId?: string;
  sessionId?: string;
  productId: string;
  quantity: number;
}

export interface RemoveCartItemInput {
  userId?: string;
  sessionId?: string;
  productId: string;
}

export interface MergeCartInput {
  sessionId: string;
  userId: string;
}

export interface ApplyCouponInput {
  userId?: string;
  sessionId?: string;
  couponCode: string;
}

export interface CartItemResponse {
  productId: string;
  quantity: number;
  retailPrice: number;
  wholesalePrice?: number;
  totalPrice: number;
  effectivePrice: number;
}

export interface CartResponse {
  id: string;
  userId: string | null;
  sessionId: string | null;
  items: CartItemResponse[];
  totalPrice: number;
  totalQuantity: number;
  isEmpty: boolean;
  updatedAt: Date;
  couponCode?: string;
  discountAmount?: number;
  grandTotal?: number;
}
