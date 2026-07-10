import { NotificationStatus } from '../entities/enums.enum';

export class NotificationState {
  private constructor(private readonly _value: NotificationStatus) {}

  static pending(): NotificationState {
    return new NotificationState(NotificationStatus.PENDING);
  }
  static sent(): NotificationState {
    return new NotificationState(NotificationStatus.SENT);
  }
  static read(): NotificationState {
    return new NotificationState(NotificationStatus.READ);
  }
  static failed(): NotificationState {
    return new NotificationState(NotificationStatus.FAILED);
  }

  get value(): NotificationStatus {
    return this._value;
  }

  canTransitionTo(newState: NotificationState): boolean {
    const transitions: Record<
      NotificationStatus,
      NotificationStatus[]
    > = {
      [NotificationStatus.PENDING]: [
        NotificationStatus.SENT,
        NotificationStatus.FAILED,
      ],
      [NotificationStatus.SENT]: [
        NotificationStatus.READ,
        NotificationStatus.FAILED,
      ],
      [NotificationStatus.READ]: [],
      [NotificationStatus.FAILED]: [
        NotificationStatus.PENDING,
        NotificationStatus.SENT,
      ],
    };
    return transitions[this._value]?.includes(newState.value) || false;
  }

  equals(other: NotificationState): boolean {
    return other instanceof NotificationState && this._value === other._value;
  }
}
