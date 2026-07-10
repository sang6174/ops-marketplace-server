import { OrderId } from '../value-objects/OrderId';
import { BuyerId } from '../value-objects/BuyerId';
import { SellerId } from '../value-objects/SellerId';
import { PaymentId } from '../value-objects/PaymentId';
import { Money } from '../value-objects/Money';

export abstract class OrderEvent {
  constructor(
    public readonly orderId: OrderId,
    public readonly buyerId: BuyerId,
    public readonly timestamp: Date,
  ) {}
}

export class OrderCreated extends OrderEvent {
  constructor(
    orderId: OrderId,
    buyerId: BuyerId,
    public readonly sellerId: SellerId,
    public readonly totalAmount: Money,
    timestamp: Date,
  ) {
    super(orderId, buyerId, timestamp);
  }
}

export class OrderConfirmed extends OrderEvent {
  constructor(
    orderId: OrderId,
    buyerId: BuyerId,
    public readonly confirmedBy: 'BUYER' | 'SYSTEM' | 'ADMIN',
    timestamp: Date,
  ) {
    super(orderId, buyerId, timestamp);
  }
}

export class OrderPaid extends OrderEvent {
  constructor(
    orderId: OrderId,
    buyerId: BuyerId,
    public readonly paymentId: PaymentId,
    public readonly amount: Money,
    timestamp: Date,
  ) {
    super(orderId, buyerId, timestamp);
  }
}

export class OrderShipped extends OrderEvent {
  constructor(
    orderId: OrderId,
    buyerId: BuyerId,
    timestamp: Date,
    public readonly trackingNumber?: string,
  ) {
    super(orderId, buyerId, timestamp);
  }
}

export class OrderDelivered extends OrderEvent {
  constructor(
    orderId: OrderId,
    buyerId: BuyerId,
    public readonly deliveredAt: Date,
    timestamp: Date,
  ) {
    super(orderId, buyerId, timestamp);
  }
}

export class OrderCancelled extends OrderEvent {
  constructor(
    orderId: OrderId,
    buyerId: BuyerId,
    public readonly reason?: string,
    public readonly cancelledBy:
      | 'BUYER'
      | 'SELLER'
      | 'ADMIN'
      | 'SYSTEM' = 'BUYER',
    timestamp: Date = new Date(),
  ) {
    super(orderId, buyerId, timestamp);
  }
}

export class OrderRefunded extends OrderEvent {
  constructor(
    orderId: OrderId,
    buyerId: BuyerId,
    public readonly refundAmount: Money,
    public readonly reason?: string,
    timestamp: Date = new Date(),
  ) {
    super(orderId, buyerId, timestamp);
  }
}

export class OrderUpdated extends OrderEvent {
  constructor(
    orderId: OrderId,
    buyerId: BuyerId,
    public readonly updatedFields: string[],
    timestamp: Date,
  ) {
    super(orderId, buyerId, timestamp);
  }
}

export class OrderPaymentIntentCreated extends OrderEvent {
  constructor(
    orderId: OrderId,
    buyerId: BuyerId,
    public readonly paymentIntentId: string,
    public readonly amount: Money,
    timestamp: Date,
  ) {
    super(orderId, buyerId, timestamp);
  }
}

export class OrderPaymentFailed extends OrderEvent {
  constructor(
    orderId: OrderId,
    buyerId: BuyerId,
    public readonly errorMessage: string,
    timestamp: Date,
  ) {
    super(orderId, buyerId, timestamp);
  }
}
