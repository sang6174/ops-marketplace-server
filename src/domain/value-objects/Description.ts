export class Description {
  private constructor(private readonly _value: string | null) {}

  static create(value?: string): Description {
    const trimmed = value?.trim() || null;
    if (trimmed !== null && trimmed.length > 1000) {
      throw new Error('Description must not exceed 1000 characters');
    }
    return new Description(trimmed);
  }

  get value(): string | null {
    return this._value;
  }

  isEmpty(): boolean {
    return this._value === null || this._value.length === 0;
  }

  equals(other: Description): boolean {
    return other instanceof Description && this._value === other._value;
  }
}
