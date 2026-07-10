import { Cart } from '@/domain/entities/orders/Cart';

export interface ICartDomainService {
  validateProductForCart(productId: string, quantity: number): Promise<boolean>;
  calculateGrandTotal(
    cart: Cart,
    couponCode?: string,
  ): Promise<{ grandTotal: number; discountAmount: number }>;
  refreshCartPrices(cart: Cart): Promise<void>;
  validateCart(cart: Cart): Promise<{ valid: boolean; errors: string[] }>;
  mergeCarts(sourceCart: Cart, targetCart: Cart): Cart;
}
