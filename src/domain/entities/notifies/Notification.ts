// domain/entities/Notification.ts
import { NotificationId } from '../../value-objects/NotificationId';
import { UserId } from '../../value-objects/UserId';
import { NotificationType } from '../enums.enum';
import { NotificationTitle } from '../../value-objects/NotificationTitle';
import { NotificationContent } from '../../value-objects/NotificationContent';
import { NotificationPriorityState } from '../../value-objects/NotificationPriority';
import { NotificationState } from '../../value-objects/NotificationState';
import { NotificationChannelProviders } from '../../value-objects/NotificationChannels';
import { NotificationMetadata } from '../../value-objects/NotificationMetadata';
import {
  INotificationState,
  PendingState,
  SentState,
  ReadState,
  FailedState,
} from '../../state/NotificationState';
import {
  NotificationCreated,
  NotificationSent,
  NotificationRead,
  NotificationFailed,
} from '../../events/NotificationEvents';

export class Notification {
  private _state: INotificationState;
  private _events: any[] = [];

  private constructor(
    public readonly id: NotificationId,
    public readonly userId: UserId,
    public readonly type: NotificationType,
    private _title: NotificationTitle,
    private _content: NotificationContent,
    private _priority: NotificationPriorityState,
    private _channels: NotificationChannelProviders,
    private _metadata: NotificationMetadata,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    private _sentAt: Date | null,
    private _readAt: Date | null,
    initialState?: INotificationState,
  ) {
    this._state = initialState || new PendingState();
  }

  static create(props: {
    id: NotificationId;
    userId: UserId;
    type: NotificationType;
    title: NotificationTitle;
    content: NotificationContent;
    priority?: NotificationPriorityState;
    channels?: NotificationChannelProviders;
    metadata?: NotificationMetadata;
    createdAt?: Date;
  }): Notification {
    const now = props.createdAt || new Date();
    const priority = props.priority ?? NotificationPriorityState.normal();
    const channels = props.channels ?? NotificationChannelProviders.default();
    const metadata = props.metadata ?? NotificationMetadata.create();

    const notification = new Notification(
      props.id,
      props.userId,
      props.type,
      props.title,
      props.content,
      priority,
      channels,
      metadata,
      now,
      now,
      null,
      null,
      new PendingState(),
    );

    notification.addEvent(
      new NotificationCreated(
        props.id,
        props.userId,
        props.type,
        props.title,
        props.content,
        now,
      ),
    );
    return notification;
  }

  static reconstitute(props: {
    id: NotificationId;
    userId: UserId;
    type: NotificationType;
    title: NotificationTitle;
    content: NotificationContent;
    priority: NotificationPriorityState;
    status: NotificationState; // Value Object
    channels: NotificationChannelProviders;
    metadata: NotificationMetadata;
    createdAt: Date;
    updatedAt: Date;
    sentAt: Date | null;
    readAt: Date | null;
  }): Notification {
    const state = Notification.createStateFromStatus(props.status);
    const notification = new Notification(
      props.id,
      props.userId,
      props.type,
      props.title,
      props.content,
      props.priority,
      props.channels,
      props.metadata,
      props.createdAt,
      props.updatedAt,
      props.sentAt,
      props.readAt,
      state,
    );
    return notification;
  }

  private static createStateFromStatus(
    status: NotificationState,
  ): INotificationState {
    if (status.equals(NotificationState.pending())) return new PendingState();
    if (status.equals(NotificationState.sent())) return new SentState();
    if (status.equals(NotificationState.read())) return new ReadState();
    if (status.equals(NotificationState.failed())) return new FailedState();
    throw new Error(`Unknown status: ${status.value}`);
  }

  get title(): NotificationTitle {
    return this._title;
  }
  get content(): NotificationContent {
    return this._content;
  }

  get priority(): NotificationPriorityState {
    return this._priority;
  }

  get channels(): NotificationChannelProviders {
    return this._channels;
  }
  get metadata(): NotificationMetadata {
    return this._metadata;
  }

  get status(): NotificationState {
    return this._state.status;
  }

  get sentAt(): Date | null {
    return this._sentAt;
  }

  get readAt(): Date | null {
    return this._readAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get events(): any[] {
    return [...this._events];
  }

  markAsSent(timestamp: Date = new Date()): void {
    this._state.send(this);
    this._sentAt = timestamp;
    this._touch(timestamp);
    this.addEvent(
      new NotificationSent(
        this.id,
        this.userId,
        this._channels.channels.map((c) => c.value),
        timestamp,
      ),
    );
  }

  markAsRead(timestamp: Date = new Date()): void {
    this._state.read(this);
    this._readAt = timestamp;
    this._touch(timestamp);
    this.addEvent(new NotificationRead(this.id, this.userId, timestamp));
  }

  markAsFailed(reason?: string, timestamp: Date = new Date()): void {
    this._state.fail(this, reason);
    this._touch(timestamp);
    this.addEvent(
      new NotificationFailed(this.id, this.userId, timestamp, reason),
    );
  }

  setState(status: NotificationState): void {
    this._state = Notification.createStateFromStatus(status);
  }

  isDelivered(): boolean {
    return (
      this.status.equals(NotificationState.sent()) ||
      this.status.equals(NotificationState.read())
    );
  }

  private _touch(timestamp: Date): void {
    this._updatedAt = timestamp;
  }

  private addEvent(event: any): void {
    this._events.push(event);
  }

  clearEvents(): void {
    this._events = [];
  }

  equals(other: Notification): boolean {
    return this.id.equals(other.id);
  }
}
