import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { JwtAuthGuard } from '@modules/auth/guards';
import { GetUser } from '@common/decorators';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  QueryNotificationsDto,
} from './dtos/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a notification for the current user' })
  create(@GetUser() user: AuthUser, @Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get notifications for the current user' })
  findAll(@GetUser() user: AuthUser, @Query() dto: QueryNotificationsDto) {
    return this.notificationsService.findAll(user.id, dto);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@GetUser() user: AuthUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by ID' })
  findById(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.findById(id, user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
