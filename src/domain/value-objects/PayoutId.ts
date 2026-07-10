export class PayoutId {
  private constructor(public readonly value: string) {}

  static create(value: string): PayoutId {
    if (!value || value.trim().length === 0) {
      throw new Error('PayoutId cannot be empty');
    }
    return new PayoutId(value);
  }

  static generate(): PayoutId {
    return new PayoutId(crypto.randomUUID());
  }

  equals(other: PayoutId): boolean {
    return other instanceof PayoutId && this.value === other.value;
  }
}
