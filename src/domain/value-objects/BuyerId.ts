export class BuyerId {
  private constructor(public readonly value: string) {}

  static create(value: string): BuyerId {
    if (!value || value.trim().length === 0) {
      throw new Error('BuyerId cannot be empty');
    }
    return new BuyerId(value);
  }

  static generate(): BuyerId {
    return new BuyerId(crypto.randomUUID());
  }

  equals(other: BuyerId): boolean {
    return other instanceof BuyerId && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
