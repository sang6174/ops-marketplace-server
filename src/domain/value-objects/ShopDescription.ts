export class ShopDescription {
  private constructor(private readonly _value: string | null) {}

  static create(value?: string): ShopDescription {
    const trimmed = value?.trim() || null;
    if (trimmed !== null && trimmed.length > 500) {
      throw new Error('Shop description must not exceed 500 characters');
    }
    return new ShopDescription(trimmed);
  }

  get value(): string | null {
    return this._value;
  }

  isEmpty(): boolean {
    return this._value === null || this._value.length === 0;
  }

  equals(other: ShopDescription): boolean {
    return other instanceof ShopDescription && this._value === other._value;
  }
}
