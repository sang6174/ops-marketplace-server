export class ProductDescription {
  private constructor(private readonly _value: string) {}

  static create(value: string): ProductDescription {
    return new ProductDescription(value.trim());
  }

  get value(): string {
    return this._value;
  }

  equals(other: ProductDescription): boolean {
    return other instanceof ProductDescription && this._value === other._value;
  }
}
