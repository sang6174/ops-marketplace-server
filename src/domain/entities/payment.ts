// domain/entities/payment.ts
import { PaymentMethod, PaymentStatus } from './enums.enum';

export class Payment {
  private constructor(
    public readonly id: string,
    public readonly orderId: string,
    private _amount: number,
    public readonly currency: string,
    public readonly method: PaymentMethod,
    private _status: PaymentStatus,
    private _paymentIntentId: string,
    public readonly gateway: string,
    private _metadata: Record<string, any>,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    private _refundedAt?: Date,
    private _errorMessage?: string,
    private _paidAt?: Date,
    private _refundReason?: string,
  ) {}

  get amount(): number {
    return this._amount;
  }

  get status(): PaymentStatus {
    return this._status;
  }

  get paymentIntentId(): string {
    return this._paymentIntentId;
  }

  get metadata(): Record<string, any> {
    return { ...this._metadata };
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get refundedAt(): Date | undefined {
    return this._refundedAt;
  }

  get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  get paidAt(): Date | undefined {
    return this._paidAt;
  }

  get refundReason(): string | undefined {
    return this._refundReason;
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

  static create(input: {
    orderId: string;
    amount: number;
    currency: string;
    method: PaymentMethod;
    paymentIntentId: string;
    gateway: string;
    metadata?: Record<string, any>;
  }): Payment {
    if (input.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    if (!input.currency || input.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }
    if (!input.paymentIntentId || input.paymentIntentId.trim().length === 0) {
      throw new Error('Payment intent ID is required');
    }

    const now = new Date();
    return new Payment(
      crypto.randomUUID(),
      input.orderId,
      input.amount,
      input.currency.trim(),
      input.method,
      PaymentStatus.PENDING,
      input.paymentIntentId.trim(),
      input.gateway.trim(),
      input.metadata ?? {},
      now,
      now,
    );
  }

  markAsPaid(paidAt?: Date): void {
    if (this.isPaid()) {
      throw new Error('Payment is already marked as paid');
    }
    if (this.isFailed()) {
      throw new Error('Cannot mark a failed payment as paid');
    }
    if (this.isRefunded()) {
      throw new Error('Cannot mark a refunded payment as paid');
    }

    this._status = PaymentStatus.SUCCEEDED;
    this._paidAt = paidAt ?? new Date();
    this._errorMessage = undefined; // clear any previous error
    this._touch();
  }

  markAsFailed(errorMessage: string): void {
    if (this.isPaid()) {
      throw new Error('Cannot mark a paid payment as failed');
    }
    if (this.isRefunded()) {
      throw new Error('Cannot mark a refunded payment as failed');
    }
    if (this.isFailed()) {
      // Update the error message if already failed
      this._errorMessage = errorMessage;
      this._touch();
      return;
    }

    this._status = PaymentStatus.FAILED;
    this._errorMessage = errorMessage;
    this._touch();
  }

  refund(refundedAt?: Date, reason?: string): void {
    if (!this.isPaid()) {
      throw new Error('Only paid payments can be refunded');
    }
    if (this.isRefunded()) {
      throw new Error('Payment is already refunded');
    }
    if (this.isFailed()) {
      throw new Error('Cannot refund a failed payment');
    }

    this._status = PaymentStatus.REFUNDED;
    this._refundedAt = refundedAt ?? new Date();
    this._refundReason = reason;
    this._touch();
  }

  updatePaymentIntentId(newIntentId: string): void {
    if (!newIntentId || newIntentId.trim().length === 0) {
      throw new Error('Payment intent ID cannot be empty');
    }
    if (this.isPaid() || this.isRefunded()) {
      throw new Error(
        'Cannot update payment intent ID after payment is settled',
      );
    }
    this._paymentIntentId = newIntentId.trim();
    this._touch();
  }

  updateMetadata(newMetadata: Record<string, any>): void {
    this._metadata = { ...newMetadata };
    this._touch();
  }

  setMetadataKey(key: string, value: any): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this._metadata[key] = value;
    this._touch();
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }
}
