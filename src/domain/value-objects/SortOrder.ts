export class SortOrder {
  private constructor(private readonly _value: number) {
    if (!Number.isInteger(_value) || _value < 0) {
      throw new Error('SortOrder must be a non-negative integer');
    }
  }

  static fromNumber(value: number): SortOrder {
    return new SortOrder(Math.floor(value));
  }

  get value(): number {
    return this._value;
  }

  equals(other: SortOrder): boolean {
    return other instanceof SortOrder && this._value === other._value;
  }
}
