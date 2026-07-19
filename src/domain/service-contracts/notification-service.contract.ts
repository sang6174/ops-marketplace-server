import { Notification } from '../entities/notifies/Notification';
import { NotificationType, NotificationPriority } from '../entities/enums.enum';

export interface NotificationMessage {
  userId: string;
  email?: string;
  phone?: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface INotificationChannel {
  readonly channelName: string;
  send(message: NotificationMessage): Promise<void>;
}

export interface INotificationService {
  createInternalNotification(props: {
    userId: string;
    type: NotificationType;
    title: string;
    content: string;
    priority?: NotificationPriority;
    metadata?: Record<string, any>;
  }): Promise<Notification>;

  sendMultiChannelNotification(props: {
    userId: string;
    email?: string;
    phone?: string;
    type: NotificationType;
    title: string;
    content: string;
    priority?: NotificationPriority;
    channels: string[];
    metadata?: Record<string, any>;
  }): Promise<Notification>;

  markAsRead(notificationId: string, userId: string): Promise<void>;
  getNotificationsByUser(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean },
  ): Promise<Notification[]>;
}
