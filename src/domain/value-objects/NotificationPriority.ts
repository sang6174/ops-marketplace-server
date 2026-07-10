import { NotificationPriority } from '../entities/enums.enum';

export class NotificationPriorityState {
  private constructor(private readonly _value: NotificationPriority) {}

  static low(): NotificationPriorityState {
    return new NotificationPriorityState(NotificationPriority.LOW);
  }
  static normal(): NotificationPriorityState {
    return new NotificationPriorityState(NotificationPriority.NORMAL);
  }
  static high(): NotificationPriorityState {
    return new NotificationPriorityState(NotificationPriority.HIGH);
  }
  static urgent(): NotificationPriorityState {
    return new NotificationPriorityState(NotificationPriority.URGENT);
  }
  static fromString(value: string): NotificationPriorityState {
    const normalized = value.toLowerCase().trim();
    switch (normalized) {
      case 'low':
        return NotificationPriorityState.low();
      case 'normal':
        return NotificationPriorityState.normal();
      case 'high':
        return NotificationPriorityState.high();
      case 'urgent':
        return NotificationPriorityState.urgent();
      default:
        throw new Error(`Invalid priority: ${value}`);
    }
  }

  get value(): NotificationPriority {
    return this._value;
  }

  equals(other: NotificationPriorityState): boolean {
    return (
      other instanceof NotificationPriorityState && this._value === other._value
    );
  }
}
