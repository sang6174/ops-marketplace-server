export class PayoutReference {
  private constructor(private readonly _value: string) {}

  static create(value: string): PayoutReference {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new Error('Reference cannot be empty');
    if (trimmed.length > 100)
      throw new Error('Reference must not exceed 100 characters');
    return new PayoutReference(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: PayoutReference): boolean {
    return other instanceof PayoutReference && this._value === other._value;
  }
}
