export class VehicleDescription {
  private constructor(private readonly _value: string | null) {
    if (_value !== null) {
      const trimmed = _value.trim();
      if (trimmed.length > 500) {
        throw new Error('Vehicle description must not exceed 500 characters');
      }
      this._value = trimmed || null;
    }
  }

  static create(value?: string): VehicleDescription {
    return new VehicleDescription(value?.trim() || null);
  }

  get value(): string | null {
    return this._value;
  }

  isEmpty(): boolean {
    return this._value === null || this._value.length === 0;
  }

  equals(other: VehicleDescription): boolean {
    return other instanceof VehicleDescription && this._value === other._value;
  }

  toString(): string {
    return this._value || '';
  }
}
