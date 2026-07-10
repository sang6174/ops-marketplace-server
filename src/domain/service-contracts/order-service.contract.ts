import { Order, OrderItem } from '@/domain/entities/orders/Order';
import { Address } from '@/domain/entities/value-objects/address';

export interface OrderCalculationResult {
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
}

export interface OrderItemValidationResult {
  valid: boolean;
  errors: string[];
}

export interface IOrderDomainService {
  calculateOrderTotals(
    items: Array<{ quantity: number; price: number }>,
    shippingAddress: Address,
    orderWeight?: number,
  ): OrderCalculationResult;
  validateOrderItems(items: OrderItem[]): OrderItemValidationResult;
  canCancelOrder(order: Order): boolean;
  canShipOrder(order: Order): boolean;
  canDeliverOrder(order: Order): boolean;
  isEligibleForRefund(order: Order): boolean;
  mergeDuplicateItems(items: OrderItem[]): OrderItem[];
  recalculateTotals(order: Order): OrderCalculationResult;
}
