import { Notification } from '@/domain/entities/notifies/Notification';
import { SendNotificationInput } from '../../interfaces/dtos/notification.dto';

export interface ISendNotificationUseCase {
  execute(input: SendNotificationInput): Promise<Notification>;
}

export interface IMarkAsReadUseCase {
  execute(notificationId: string, userId: string): Promise<void>;
}

export interface IGetUserNotificationsUseCase {
  execute(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean },
  ): Promise<Notification[]>;
}
