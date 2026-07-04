import { Address } from './address';
import { OrderStatus, OrderType, PaymentStatus } from './enums.enum';

export class OrderItem {
  constructor(
    public productId: string,
    public productName: string,
    public quantity: number,
    public unitPrice: number,
    public wholesalePrice?: number,
  ) {}
}

export class Order {
  private constructor(
    public readonly id: string,
    public buyerId: string,
    public sellerId: string,
    public orderType: OrderType,
    public items: OrderItem[],
    public subtotal: number,
    public couponDiscount: number,
    public totalAmount: number,
    public shippingFee: number,
    public grandTotal: number,
    public shippingAddress: Address,
    public paymentMethod: string,
    public paymentStatus: PaymentStatus,
    public orderStatus: OrderStatus,
    public createdAt: Date,
    public updatedAt: Date,
    public paymentIntentId?: string,
    public shippedAt?: Date,
    public deliveredAt?: Date,
    public cancelledAt?: Date,
    public notes?: string,
  ) {}
}
