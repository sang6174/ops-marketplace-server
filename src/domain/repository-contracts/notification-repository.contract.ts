import { Notification } from '../entities/notifies/Notification';
import { IBaseRepository } from './base-repository.interface';

export interface INotificationRepository extends IBaseRepository<Notification> {
  findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
}
