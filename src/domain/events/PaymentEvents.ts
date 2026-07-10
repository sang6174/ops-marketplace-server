import { PaymentId } from '../value-objects/PaymentId';
import { OrderId } from '../value-objects/OrderId';
import { Money } from '../value-objects/Money';
import { PaymentIntentId } from '../value-objects/PaymentIntentId';
import { Gateway } from '../value-objects/Gateway';
import { Metadata } from '../value-objects/Metadata';

export abstract class PaymentEvent {
  constructor(
    public readonly paymentId: PaymentId,
    public readonly orderId: OrderId,
    public readonly timestamp: Date,
  ) {}
}

export class PaymentCreated extends PaymentEvent {
  constructor(
    paymentId: PaymentId,
    orderId: OrderId,
    public readonly amount: Money,
    public readonly gateway: Gateway,
    timestamp: Date,
  ) {
    super(paymentId, orderId, timestamp);
  }
}

export class PaymentSucceeded extends PaymentEvent {
  constructor(
    paymentId: PaymentId,
    orderId: OrderId,
    public readonly amount: Money,
    timestamp: Date,
  ) {
    super(paymentId, orderId, timestamp);
  }
}

export class PaymentFailed extends PaymentEvent {
  constructor(
    paymentId: PaymentId,
    orderId: OrderId,
    public readonly errorMessage: string,
    timestamp: Date,
  ) {
    super(paymentId, orderId, timestamp);
  }
}

export class PaymentRefunded extends PaymentEvent {
  constructor(
    paymentId: PaymentId,
    orderId: OrderId,
    public readonly amount: Money,
    public readonly reason?: string,
    timestamp: Date = new Date(),
  ) {
    super(paymentId, orderId, timestamp);
  }
}

export class PaymentIntentUpdated extends PaymentEvent {
  constructor(
    paymentId: PaymentId,
    orderId: OrderId,
    public readonly newIntentId: PaymentIntentId,
    timestamp: Date,
  ) {
    super(paymentId, orderId, timestamp);
  }
}

export class PaymentMetadataUpdated extends PaymentEvent {
  constructor(
    paymentId: PaymentId,
    orderId: OrderId,
    public readonly metadata: Metadata,
    timestamp: Date,
  ) {
    super(paymentId, orderId, timestamp);
  }
}
