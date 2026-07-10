export class PaymentIntentId {
  private constructor(public readonly value: string) {}
  static create(value: string): PaymentIntentId {
    if (!value || value.trim().length === 0)
      throw new Error('PaymentIntentId cannot be empty');
    return new PaymentIntentId(value);
  }
  equals(other: PaymentIntentId): boolean {
    return other instanceof PaymentIntentId && this.value === other.value;
  }
}
