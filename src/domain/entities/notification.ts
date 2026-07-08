import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from './enums.enum';

export class Notification {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    private _type: NotificationType,
    private _title: string,
    private _content: string,
    private _status: NotificationStatus,
    private _priority: NotificationPriority,
    public readonly createdAt: Date,
    private _sentAt: Date | null,
    private _readAt: Date | null,
    private _metadata: Record<string, any> | null,
    private _channels: string[],
  ) {}

  static create(props: {
    userId: string;
    type: NotificationType;
    title: string;
    content: string;
    priority?: NotificationPriority;
    channels?: string[];
    metadata?: Record<string, any>;
  }): Notification {
    return new Notification(
      crypto.randomUUID(),
      props.userId,
      props.type,
      props.title,
      props.content,
      NotificationStatus.PENDING,
      props.priority || NotificationPriority.NORMAL,
      new Date(),
      null,
      null,
      props.metadata || null,
      props.channels || ['internal'],
    );
  }

  // --- Getters ---
  get type(): NotificationType {
    return this._type;
  }
  get title(): string {
    return this._title;
  }
  get content(): string {
    return this._content;
  }
  get status(): NotificationStatus {
    return this._status;
  }
  get priority(): NotificationPriority {
    return this._priority;
  }
  get sentAt(): Date | null {
    return this._sentAt;
  }
  get readAt(): Date | null {
    return this._readAt;
  }
  get metadata(): Record<string, any> | null {
    return this._metadata;
  }
  get channels(): string[] {
    return [...this._channels];
  }

  // --- Behavior methods ---
  markAsSent(): void {
    if (this._status === NotificationStatus.SENT) return;
    this._status = NotificationStatus.SENT;
    this._sentAt = new Date();
  }

  markAsFailed(): void {
    this._status = NotificationStatus.FAILED;
  }

  markAsRead(): void {
    if (this._status === NotificationStatus.READ) return;
    if (!this._channels.includes('internal')) {
      throw new Error('Only internal notifications can be marked as read');
    }
    this._status = NotificationStatus.READ;
    this._readAt = new Date();
  }

  isDelivered(): boolean {
    return (
      this._status === NotificationStatus.SENT ||
      this._status === NotificationStatus.READ
    );
  }

  equals(other: Notification): boolean {
    if (!(other instanceof Notification)) return false;
    return this.id === other.id;
  }
}
