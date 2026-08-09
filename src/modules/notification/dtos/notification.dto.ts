import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationChannel,
} from '@infrastructure/generated/prisma/enums';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ example: 'Order Confirmed' })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'Your order #123 has been confirmed.' })
  @IsString()
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({ enum: NotificationPriority, default: 'NORMAL' })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    default: ['INTERNAL'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({ example: { orderId: 'order-123' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class QueryNotificationsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationStatus })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ description: 'Only unread notifications' })
  @IsOptional()
  @Type(() => Boolean)
  unreadOnly?: boolean;
}

export class MarkAsReadDto {
  @ApiProperty({ example: 'notification-uuid' })
  @IsString()
  notificationId!: string;
}

export class NotificationResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiProperty({ enum: NotificationPriority })
  priority!: NotificationPriority;

  @ApiProperty({ enum: NotificationChannel, isArray: true })
  channels!: NotificationChannel[];

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  sentAt?: Date;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class UnreadCountResponse {
  @ApiProperty()
  count!: number;
}
