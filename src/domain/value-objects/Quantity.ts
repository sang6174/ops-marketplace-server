export class Quantity {
  private constructor(private readonly _value: number) {
    if (!Number.isInteger(_value)) {
      throw new Error('Quantity must be an integer');
    }
    if (_value < 0) {
      throw new Error('Quantity cannot be negative');
    }
    if (_value > 1_000_000_000) {
      throw new Error('Quantity exceeds maximum allowed');
    }
  }

  static fromNumber(value: number): Quantity {
    return new Quantity(Math.floor(value));
  }

  static zero(): Quantity {
    return new Quantity(0);
  }

  get value(): number {
    return this._value;
  }

  add(other: Quantity): Quantity {
    return new Quantity(this._value + other.value);
  }

  subtract(other: Quantity): Quantity {
    if (other.value > this._value) {
      throw new Error(`Insufficient quantity: ${this._value} < ${other.value}`);
    }
    return new Quantity(this._value - other.value);
  }

  isGreaterThan(other: Quantity): boolean {
    return this._value > other.value;
  }

  isGreaterThanOrEqual(other: Quantity): boolean {
    return this._value >= other.value;
  }

  isLessThan(other: Quantity): boolean {
    return this._value < other.value;
  }

  isLessThanOrEqual(other: Quantity): boolean {
    return this._value <= other.value;
  }

  equals(other: Quantity): boolean {
    return other instanceof Quantity && this._value === other._value;
  }

  toString(): string {
    return `${this._value}`;
  }
}
