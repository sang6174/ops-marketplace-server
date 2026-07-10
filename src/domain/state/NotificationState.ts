// domain/state/NotificationState.ts
import { NotificationState } from '../value-objects/NotificationState';
import { Notification } from '../entities/notifies/Notification';

export interface INotificationState {
  get status(): NotificationState;
  canSend(): boolean;
  canRead(): boolean;
  canFail(): boolean;
  send(notification: Notification): void;
  read(notification: Notification): void;
  fail(notification: Notification, reason?: string): void;
}

export abstract class BaseNotificationState implements INotificationState {
  abstract get status(): NotificationState;

  canSend(): boolean {
    return this.status.equals(NotificationState.pending());
  }

  canRead(): boolean {
    return this.status.equals(NotificationState.sent());
  }

  canFail(): boolean {
    return (
      this.status.equals(NotificationState.pending()) ||
      this.status.equals(NotificationState.sent())
    );
  }

  send(notification: Notification): void {
    if (!this.canSend()) {
      throw new Error(`Cannot send from state ${this.status.value}`);
    }
    notification.setState(NotificationState.sent());
  }

  read(notification: Notification): void {
    if (!this.canRead()) {
      throw new Error(`Cannot read from state ${this.status.value}`);
    }
    if (!notification.channels.hasInternal()) {
      throw new Error('Only internal notifications can be marked as read');
    }
    notification.setState(NotificationState.read());
  }

  fail(notification: Notification, reason?: string): void {
    if (!this.canFail()) {
      throw new Error(`Cannot fail from state ${this.status.value}`);
    }
    notification.setState(NotificationState.failed());
  }
}

export class PendingState extends BaseNotificationState {
  get status(): NotificationState {
    return NotificationState.pending();
  }
}

export class SentState extends BaseNotificationState {
  get status(): NotificationState {
    return NotificationState.sent();
  }
  override canSend(): boolean {
    return false;
  }
}

export class ReadState extends BaseNotificationState {
  get status(): NotificationState {
    return NotificationState.read();
  }
  override canSend(): boolean {
    return false;
  }
  override canRead(): boolean {
    return false;
  }
  override canFail(): boolean {
    return false;
  }
}

export class FailedState extends BaseNotificationState {
  get status(): NotificationState {
    return NotificationState.failed();
  }
  override canSend(): boolean {
    return true;
  } // có thể retry
  override canRead(): boolean {
    return false;
  }
  override canFail(): boolean {
    return false;
  }
}
