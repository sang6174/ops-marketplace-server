export class ProductId {
  private constructor(public readonly value: string) {}

  static create(value: string): ProductId {
    if (!value || value.trim().length === 0)
      throw new Error('ProductId cannot be empty');
    return new ProductId(value);
  }

  static generate(): ProductId {
    return new ProductId(crypto.randomUUID());
  }

  equals(other: ProductId): boolean {
    return other instanceof ProductId && this.value === other.value;
  }
}
