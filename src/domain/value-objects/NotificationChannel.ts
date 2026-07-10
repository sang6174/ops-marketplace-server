import { NotificationChannel } from '../entities/enums.enum';

export class NotificationChannelProvider {
  private constructor(private readonly _value: NotificationChannel) {}

  static internal(): NotificationChannelProvider {
    return new NotificationChannelProvider(NotificationChannel.INTERNAL);
  }

  static email(): NotificationChannelProvider {
    return new NotificationChannelProvider(NotificationChannel.EMAIL);
  }

  static sms(): NotificationChannelProvider {
    return new NotificationChannelProvider(NotificationChannel.SMS);
  }

  static push(): NotificationChannelProvider {
    return new NotificationChannelProvider(NotificationChannel.PUSH);
  }

  static fromString(value: string): NotificationChannelProvider {
    const normalized = value.toLowerCase().trim();
    switch (normalized) {
      case 'internal':
        return NotificationChannelProvider.internal();
      case 'email':
        return NotificationChannelProvider.email();
      case 'sms':
        return NotificationChannelProvider.sms();
      case 'push':
        return NotificationChannelProvider.push();
      default:
        throw new Error(`Invalid channel: ${value}`);
    }
  }

  get value(): NotificationChannel {
    return this._value;
  }
  isInternal(): boolean {
    return this._value === NotificationChannel.INTERNAL;
  }

  equals(other: NotificationChannelProvider): boolean {
    return (
      other instanceof NotificationChannelProvider &&
      this._value === other._value
    );
  }
}
