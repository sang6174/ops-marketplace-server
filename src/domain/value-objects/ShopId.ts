export class ShopId {
  private constructor(public readonly value: string) {}

  static create(value: string): ShopId {
    if (!value || value.trim().length === 0) {
      throw new Error('ShopId cannot be empty');
    }
    return new ShopId(value);
  }

  static generate(): ShopId {
    return new ShopId(crypto.randomUUID());
  }

  equals(other: ShopId): boolean {
    return other instanceof ShopId && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
