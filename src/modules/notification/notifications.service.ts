import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  NOTIFICATION_PRISMA_REPOSITORY,
} from './infrastructure/repositories/notification-prisma.repository';
import { INotificationRepository } from '@domain/repository-contracts/notification-repository.contract';
import { toPrismaPage } from '@common/utils';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationChannel,
} from '@infrastructure/generated/prisma/enums';
import {
  CreateNotificationDto,
  QueryNotificationsDto,
  NotificationResponse,
  UnreadCountResponse,
} from './dtos/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_PRISMA_REPOSITORY)
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async create(dto: CreateNotificationDto, userId: string): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        priority: dto.priority ?? NotificationPriority.NORMAL,
        channels: dto.channels ?? [NotificationChannel.INTERNAL],
        metadata: dto.metadata ?? undefined,
      },
    });

    return this.mapResponse(notification);
  }

  async findAll(userId: string, dto: QueryNotificationsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const where: Record<string, unknown> = { userId };
    if (dto.type) where.type = dto.type;
    if (dto.status) where.status = dto.status;
    if (dto.unreadOnly) where.status = NotificationStatus.PENDING;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toPrismaPage(page, limit),
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapResponse(item)),
      meta: { total, page, limit },
    };
  }

  async findById(id: string, userId: string): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new ResourceNotFoundException('Notification', id);
    }

    return this.mapResponse(notification);
  }

  async markAsRead(id: string, userId: string): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new ResourceNotFoundException('Notification', id);
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return this.mapResponse(updated);
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        status: NotificationStatus.PENDING,
      },
    });

    return { count };
  }

  private mapResponse(item: any): NotificationResponse {
    return {
      id: item.id,
      userId: item.userId,
      type: item.type,
      title: item.title,
      content: item.content,
      status: item.status,
      priority: item.priority,
      channels: item.channels,
      metadata: item.metadata ?? undefined,
      sentAt: item.sentAt ?? undefined,
      readAt: item.readAt ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
