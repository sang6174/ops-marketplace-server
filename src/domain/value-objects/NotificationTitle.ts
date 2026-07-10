export class NotificationTitle {
  private constructor(private readonly _value: string) {}

  static create(value: string): NotificationTitle {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new Error('Title cannot be empty');
    if (trimmed.length > 255)
      throw new Error('Title must not exceed 255 characters');
    return new NotificationTitle(trimmed);
  }

  get value(): string {
    return this._value;
  }
  equals(other: NotificationTitle): boolean {
    return other instanceof NotificationTitle && this._value === other._value;
  }
}
