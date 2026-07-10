export class ShipperId {
  private constructor(private readonly _value: string) {
    if (!_value || _value.trim().length === 0) {
      throw new Error('ShipperId cannot be empty');
    }
  }

  static create(value: string): ShipperId {
    return new ShipperId(value.trim());
  }

  static generate(): ShipperId {
    return new ShipperId(crypto.randomUUID());
  }

  get value(): string {
    return this._value;
  }

  equals(other: ShipperId): boolean {
    return other instanceof ShipperId && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
