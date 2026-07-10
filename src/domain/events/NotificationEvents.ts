import { NotificationId } from '../value-objects/NotificationId';
import { UserId } from '../value-objects/UserId';
import { NotificationTitle } from '../value-objects/NotificationTitle';
import { NotificationContent } from '../value-objects/NotificationContent';
import { NotificationType } from '../entities/enums.enum';

export abstract class NotificationEvent {
  constructor(
    public readonly notificationId: NotificationId,
    public readonly userId: UserId,
    public readonly timestamp: Date,
  ) {}
}

export class NotificationCreated extends NotificationEvent {
  constructor(
    notificationId: NotificationId,
    userId: UserId,
    public readonly type: NotificationType,
    public readonly title: NotificationTitle,
    public readonly content: NotificationContent,
    timestamp: Date,
  ) {
    super(notificationId, userId, timestamp);
  }
}

export class NotificationSent extends NotificationEvent {
  constructor(
    notificationId: NotificationId,
    userId: UserId,
    public readonly channels: string[],
    timestamp: Date,
  ) {
    super(notificationId, userId, timestamp);
  }
}

export class NotificationRead extends NotificationEvent {
  constructor(notificationId: NotificationId, userId: UserId, timestamp: Date) {
    super(notificationId, userId, timestamp);
  }
}

export class NotificationFailed extends NotificationEvent {
  constructor(
    notificationId: NotificationId,
    userId: UserId,
    timestamp: Date,
    public readonly reason?: string,
  ) {
    super(notificationId, userId, timestamp);
  }
}
