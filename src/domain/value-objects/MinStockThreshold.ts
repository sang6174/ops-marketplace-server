export class MinStockThreshold {
  private constructor(private readonly _value: number) {
    if (!Number.isInteger(_value)) {
      throw new Error('MinStockThreshold must be an integer');
    }
    if (_value < 0) {
      throw new Error('MinStockThreshold cannot be negative');
    }
  }

  static fromNumber(value: number): MinStockThreshold {
    return new MinStockThreshold(Math.floor(value));
  }

  get value(): number {
    return this._value;
  }

  equals(other: MinStockThreshold): boolean {
    return other instanceof MinStockThreshold && this._value === other._value;
  }
}
