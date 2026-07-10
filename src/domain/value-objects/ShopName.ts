export class ShopName {
  private constructor(private readonly _value: string) {}

  static create(value: string): ShopName {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('Shop name cannot be empty');
    }
    if (trimmed.length > 100) {
      throw new Error('Shop name must not exceed 100 characters');
    }
    if (!/^[a-zA-Z0-9\p{L}\s\-'&]+$/u.test(trimmed)) {
      throw new Error('Shop name contains invalid characters');
    }
    return new ShopName(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: ShopName): boolean {
    return other instanceof ShopName && this._value === other._value;
  }
}