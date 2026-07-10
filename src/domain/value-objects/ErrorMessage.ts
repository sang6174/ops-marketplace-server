export class ErrorMessage {
  private constructor(private readonly _value: string) {}
  static create(value: string): ErrorMessage {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new Error('Error message cannot be empty');
    return new ErrorMessage(trimmed);
  }
  get value(): string {
    return this._value;
  }
  equals(other: ErrorMessage): boolean {
    return other instanceof ErrorMessage && this._value === other._value;
  }
}
