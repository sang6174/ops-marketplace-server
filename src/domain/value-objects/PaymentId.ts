export class PaymentId {
  private constructor(public readonly value: string) {}
  static create(value: string): PaymentId {
    if (!value || value.trim().length === 0)
      throw new Error('PaymentId cannot be empty');
    return new PaymentId(value);
  }
  static generate(): PaymentId {
    return new PaymentId(crypto.randomUUID());
  }
  equals(other: PaymentId): boolean {
    return other instanceof PaymentId && this.value === other.value;
  }
}
