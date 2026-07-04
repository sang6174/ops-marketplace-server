import { PaymentMethod, PaymentStatus } from './enums.enum';

export class Payment {
  private constructor(
    public readonly id: string,
    public orderId: string,
    public amount: number,
    public currency: string,
    public method: PaymentMethod,
    public status: PaymentStatus,
    public paymentIntentId: string,
    public gateway: string,
    public metadata: Record<string, any>,
    public createdAt: Date,
    public updatedAt: Date,
    public refundedAt?: Date,
    public errorMessage?: string,
    public paidAt?: Date,
  ) {}
}
