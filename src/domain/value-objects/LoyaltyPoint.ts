export class LoyaltyPoints {
  private constructor(private readonly _value: number) {
    if (!Number.isInteger(_value)) {
      throw new Error('Loyalty points must be an integer');
    }
    if (_value < 0) {
      throw new Error('Loyalty points cannot be negative');
    }
    if (_value > 1_000_000) {
      throw new Error('Loyalty points cannot exceed 1,000,000');
    }
  }

  static zero(): LoyaltyPoints {
    return new LoyaltyPoints(0);
  }

  static fromNumber(value: number): LoyaltyPoints {
    return new LoyaltyPoints(Math.floor(value));
  }

  get value(): number {
    return this._value;
  }

  add(points: LoyaltyPoints): LoyaltyPoints {
    return new LoyaltyPoints(this._value + points.value);
  }

  subtract(points: LoyaltyPoints): LoyaltyPoints {
    if (points.value > this._value) {
      throw new Error(`Insufficient points. Available: ${this._value}`);
    }
    return new LoyaltyPoints(this._value - points.value);
  }

  isGreaterThan(points: LoyaltyPoints): boolean {
    return this._value > points.value;
  }

  equals(other: LoyaltyPoints): boolean {
    return other instanceof LoyaltyPoints && this._value === other._value;
  }

  toString(): string {
    return `${this._value} points`;
  }
}
