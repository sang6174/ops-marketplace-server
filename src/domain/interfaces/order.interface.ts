import { IAddress } from './address.interface';
import { OrderStatus, OrderType, PaymentStatus } from '../entities/enums.enum';

export interface IOrderItem {
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly wholesalePrice?: number;
}

export interface IOrder {
  readonly id: string;
  readonly buyerId: string;
  readonly sellerId: string;
  readonly orderType: OrderType;
  readonly items: IOrderItem[];
  readonly subtotal: number;
  readonly couponDiscount: number;
  readonly totalAmount: number;
  readonly shippingFee: number;
  readonly grandTotal: number;
  readonly shippingAddress: IAddress;
  readonly paymentMethod: string;
  readonly paymentStatus: PaymentStatus;
  readonly orderStatus: OrderStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly paymentIntentId?: string;
  readonly shippedAt?: Date;
  readonly deliveredAt?: Date;
  readonly cancelledAt?: Date;
  readonly notes?: string;
}
