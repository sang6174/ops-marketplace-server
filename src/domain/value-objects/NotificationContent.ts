export class NotificationContent {
  private constructor(private readonly _value: string) {}

  static create(value: string): NotificationContent {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new Error('Content cannot be empty');
    if (trimmed.length > 5000)
      throw new Error('Content must not exceed 5000 characters');
    return new NotificationContent(trimmed);
  }

  get value(): string {
    return this._value;
  }
  equals(other: NotificationContent): boolean {
    return other instanceof NotificationContent && this._value === other._value;
  }
}
