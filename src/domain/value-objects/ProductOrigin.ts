export class ProductOrigin {
  private constructor(private readonly _value: string) {}

  static create(value: string): ProductOrigin {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new Error('Origin cannot be empty');
    return new ProductOrigin(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: ProductOrigin): boolean {
    return other instanceof ProductOrigin && this._value === other._value;
  }
}
