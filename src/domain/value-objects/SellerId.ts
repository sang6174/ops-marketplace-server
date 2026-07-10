export class SellerId {
  private constructor(public readonly value: string) {}

  static create(value: string): SellerId {
    if (!value || value.trim().length === 0) {
      throw new Error('SellerId cannot be empty');
    }
    return new SellerId(value);
  }

  static generate(): SellerId {
    return new SellerId(crypto.randomUUID());
  }

  equals(other: SellerId): boolean {
    return other instanceof SellerId && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
