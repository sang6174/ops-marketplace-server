import { PaymentId } from '../../value-objects/PaymentId';
import { OrderId } from '../../value-objects/OrderId';
import { PaymentIntentId } from '../../value-objects/PaymentIntentId';
import { Gateway } from '../../value-objects/Gateway';
import { Metadata } from '../../value-objects/Metadata';
import { Money } from '../../value-objects/Money';
import { PaymentMethod, PaymentStatus } from '../enums.enum';

import {
  PaymentCreated,
  PaymentSucceeded,
  PaymentFailed,
  PaymentRefunded,
  PaymentIntentUpdated,
  PaymentMetadataUpdated,
} from '../../events/PaymentEvents';
export class Payment {
  private _events: any[] = [];

  private constructor(
    public readonly id: PaymentId,
    public readonly orderId: OrderId,
    private _amount: Money,
    private _method: PaymentMethod,
    private _status: PaymentStatus,
    private _paymentIntentId: PaymentIntentId,
    private _gateway: Gateway,
    private _metadata: Metadata,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    private _paidAt?: Date,
    private _refundedAt?: Date,
    private _errorMessage?: string,
    private _refundReason?: string,
  ) {}

  static create(props: {
    id: PaymentId;
    orderId: OrderId;
    amount: Money;
    method: PaymentMethod;
    paymentIntentId: PaymentIntentId;
    gateway: Gateway;
    metadata?: Metadata;
    createdAt?: Date;
  }): Payment {
    const now = props.createdAt || new Date();
    const metadata = props.metadata ?? Metadata.create();
    const payment = new Payment(
      props.id,
      props.orderId,
      props.amount,
      props.method,
      PaymentStatus.PENDING,
      props.paymentIntentId,
      props.gateway,
      metadata,
      now,
      now,
    );
    payment.addEvent(
      new PaymentCreated(
        props.id,
        props.orderId,
        props.amount,
        props.gateway,
        now,
      ),
    );
    return payment;
  }

  static reconstitute(props: {
    id: PaymentId;
    orderId: OrderId;
    amount: Money;
    method: PaymentMethod;
    status: PaymentStatus;
    paymentIntentId: PaymentIntentId;
    gateway: Gateway;
    metadata: Metadata;
    createdAt: Date;
    updatedAt: Date;
    paidAt?: Date;
    refundedAt?: Date;
    errorMessage?: string;
    refundReason?: string;
  }): Payment {
    return new Payment(
      props.id,
      props.orderId,
      props.amount,
      props.method,
      props.status,
      props.paymentIntentId,
      props.gateway,
      props.metadata,
      props.createdAt,
      props.updatedAt,
      props.paidAt,
      props.refundedAt,
      props.errorMessage,
      props.refundReason,
    );
  }

  get amount(): Money {
    return this._amount;
  }
  get method(): PaymentMethod {
    return this._method;
  }
  get status(): PaymentStatus {
    return this._status;
  }
  get paymentIntentId(): PaymentIntentId {
    return this._paymentIntentId;
  }
  get gateway(): Gateway {
    return this._gateway;
  }
  get metadata(): Metadata {
    return this._metadata;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get paidAt(): Date | undefined {
    return this._paidAt;
  }
  get refundedAt(): Date | undefined {
    return this._refundedAt;
  }
  get errorMessage(): string | undefined {
    return this._errorMessage;
  }
  get refundReason(): string | undefined {
    return this._refundReason;
  }
  get events(): any[] {
    return [...this._events];
  }

  isPaid(): boolean {
    return this._status === PaymentStatus.SUCCEEDED;
  }
  isPending(): boolean {
    return this._status === PaymentStatus.PENDING;
  }
  isFailed(): boolean {
    return this._status === PaymentStatus.FAILED;
  }
  isRefunded(): boolean {
    return this._status === PaymentStatus.REFUNDED;
  }
  isRefundable(): boolean {
    return this.isPaid() && !this.isRefunded();
  }

  markAsPaid(paidAt?: Date, timestamp: Date = new Date()): void {
    if (this.isPaid()) throw new Error('Payment is already marked as paid');

    if (this.isFailed())
      throw new Error('Cannot mark a failed payment as paid');
    
    if (this.isRefunded())
      throw new Error('Cannot mark a refunded payment as paid');

    this._status = PaymentStatus.SUCCEEDED;
    this._paidAt = paidAt ?? timestamp;
    this._errorMessage = undefined;
    this._touch(timestamp);
    this.addEvent(
      new PaymentSucceeded(this.id, this.orderId, this._amount, timestamp),
    );
  }

  markAsFailed(errorMessage: string, timestamp: Date = new Date()): void {
    if (this.isPaid()) throw new Error('Cannot mark a paid payment as failed');
    if (this.isRefunded())
      throw new Error('Cannot mark a refunded payment as failed');

    if (this.isFailed()) {
      this._errorMessage = errorMessage;
      this._touch(timestamp);
      return;
    }

    this._status = PaymentStatus.FAILED;
    this._errorMessage = errorMessage;
    this._touch(timestamp);
    this.addEvent(
      new PaymentFailed(this.id, this.orderId, errorMessage, timestamp),
    );
  }

  refund(
    refundedAt?: Date,
    reason?: string,
    timestamp: Date = new Date(),
  ): void {
    if (!this.isPaid()) throw new Error('Only paid payments can be refunded');
    if (this.isRefunded()) throw new Error('Payment is already refunded');

    this._status = PaymentStatus.REFUNDED;
    this._refundedAt = refundedAt ?? timestamp;
    this._refundReason = reason;
    this._touch(timestamp);
    this.addEvent(
      new PaymentRefunded(
        this.id,
        this.orderId,
        this._amount,
        reason,
        timestamp,
      ),
    );
  }

  updatePaymentIntentId(
    newIntentId: PaymentIntentId,
    timestamp: Date = new Date(),
  ): void {
    if (this.isPaid() || this.isRefunded()) {
      throw new Error(
        'Cannot update payment intent ID after payment is settled',
      );
    }
    if (this._paymentIntentId.equals(newIntentId)) return;
    this._paymentIntentId = newIntentId;
    this._touch(timestamp);
    this.addEvent(
      new PaymentIntentUpdated(
        this.id,
        this.orderId,
        this._paymentIntentId,
        timestamp,
      ),
    );
  }

  updateMetadata(newMetadata: Metadata, timestamp: Date = new Date()): void {
    if (this._metadata.equals(newMetadata)) return;
    this._metadata = newMetadata;
    this._touch(timestamp);
    this.addEvent(
      new PaymentMetadataUpdated(
        this.id,
        this.orderId,
        this._metadata,
        timestamp,
      ),
    );
  }

  setMetadataKey(key: string, value: any, timestamp: Date = new Date()): void {
    const newMeta = this._metadata.set(key, value);
    this.updateMetadata(newMeta, timestamp);
  }

  private _touch(timestamp: Date): void {
    this._updatedAt = timestamp;
  }

  private addEvent(event: any): void {
    this._events.push(event);
  }

  clearEvents(): void {
    this._events = [];
  }

  equals(other: Payment): boolean {
    return this.id.equals(other.id);
  }
}
