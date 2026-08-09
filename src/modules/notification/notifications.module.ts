import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  NotificationPrismaRepository,
  NOTIFICATION_PRISMA_REPOSITORY,
} from './infrastructure/repositories/notification-prisma.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    NotificationsService,
    NotificationPrismaRepository,
    { provide: NOTIFICATION_PRISMA_REPOSITORY, useClass: NotificationPrismaRepository },
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, NOTIFICATION_PRISMA_REPOSITORY],
})
export class NotificationsModule {}
