import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { INotificationRepository } from '@domain/repository-contracts/notification-repository.contract';
import { Notification } from '@domain/entities/notifies/Notification';
import {
  NotificationType,
  NotificationStatus,
} from '@domain/entities/enums.enum';
import { NotificationId } from '@domain/value-objects/NotificationId';
import { UserId } from '@domain/value-objects/UserId';
import { NotificationTitle } from '@domain/value-objects/NotificationTitle';
import { NotificationContent } from '@domain/value-objects/NotificationContent';
import { NotificationPriorityState } from '@domain/value-objects/NotificationPriority';
import { NotificationState } from '@domain/value-objects/NotificationState';
import { NotificationChannelProviders } from '@domain/value-objects/NotificationChannels';
import { NotificationChannelProvider } from '@domain/value-objects/NotificationChannel';
import { NotificationMetadata } from '@domain/value-objects/NotificationMetadata';

interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  status: string;
  priority: string;
  channels: string[];
  metadata: unknown;
  sentAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const NOTIFICATION_PRISMA_REPOSITORY = 'NOTIFICATION_PRISMA_REPOSITORY';

@Injectable()
export class NotificationPrismaRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Notification | null> {
    const record = await this.prisma.notification.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) return null;

    return this.mapToDomain(record as unknown as NotificationRecord);
  }

  async save(entity: Notification): Promise<Notification> {
    const data = {
      userId: entity.userId.value,
      type: entity.type,
      title: entity.title.value,
      content: entity.content.value,
      status: entity.status.value,
      priority: entity.priority.value,
      channels: entity.channels.channels.map((c) => c.value.toUpperCase()),
      metadata: entity.metadata.value,
      sentAt: entity.sentAt,
      readAt: entity.readAt,
    };

    const existing = await this.prisma.notification.findUnique({
      where: { id: entity.id.value },
    });

    if (existing) {
      const updated = await this.prisma.notification.update({
        where: { id: entity.id.value },
        data: data as any,
      });
      return this.mapToDomain(updated as unknown as NotificationRecord);
    }

    const created = await this.prisma.notification.create({
      data: {
        id: entity.id.value,
        ...data,
      } as any,
    });

    return this.mapToDomain(created as unknown as NotificationRecord);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.notification.softDelete({ id });
  }

  async findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return records.map((r) => this.mapToDomain(r as unknown as NotificationRecord));
  }

  async markAsRead(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: {
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });
  }

  private mapToDomain(record: NotificationRecord): Notification {
    return Notification.reconstitute({
      id: NotificationId.create(record.id),
      userId: UserId.create(record.userId),
      type: record.type as NotificationType,
      title: NotificationTitle.create(record.title),
      content: NotificationContent.create(record.content),
      priority: this.mapPriorityToState(record.priority),
      status: this.mapStatusToState(record.status),
      channels: NotificationChannelProviders.create(
        (record.channels ?? []).map((c) =>
          NotificationChannelProvider.fromString(c),
        ),
      ),
      metadata: NotificationMetadata.create(
        (record.metadata as Record<string, unknown>) ?? {},
      ),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      sentAt: record.sentAt,
      readAt: record.readAt,
    });
  }

  private mapStatusToState(status: string): NotificationState {
    switch (status) {
      case 'PENDING':
        return NotificationState.pending();
      case 'SENT':
        return NotificationState.sent();
      case 'READ':
        return NotificationState.read();
      case 'FAILED':
        return NotificationState.failed();
      default:
        return NotificationState.pending();
    }
  }

  private mapPriorityToState(priority: string): NotificationPriorityState {
    switch (priority) {
      case 'LOW':
        return NotificationPriorityState.low();
      case 'NORMAL':
        return NotificationPriorityState.normal();
      case 'HIGH':
        return NotificationPriorityState.high();
      case 'URGENT':
        return NotificationPriorityState.urgent();
      default:
        return NotificationPriorityState.normal();
    }
  }
}
