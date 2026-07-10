export class ProductName {
  private constructor(private readonly _value: string) {}

  static create(value: string): ProductName {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new Error('Product name cannot be empty');
    if (trimmed.length > 255)
      throw new Error('Product name must not exceed 255 characters');
    return new ProductName(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: ProductName): boolean {
    return other instanceof ProductName && this._value === other._value;
  }
}
