// domain/value-objects/Certification.ts
export class ProductCertification {
  private constructor(private readonly _value: string) {}

  static create(value: string): ProductCertification {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new Error('Certification cannot be empty');
    return new ProductCertification(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: ProductCertification): boolean {
    return (
      other instanceof ProductCertification && this._value === other._value
    );
  }
}
