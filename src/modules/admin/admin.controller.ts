// src/module/admin/admin.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { JwtAuthGuard } from '../auth/guards';
import { AdminService } from './admin.service';
import { QueryAdminUsersDto, UpdateUserStatusDto } from './dtos/admin.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // USERS MANAGEMENT
  @Get('users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[ADMIN] List all users' })
  listUsers(@GetUser() user: AuthUser, @Query() dto: QueryAdminUsersDto) {
    return this.adminService.listUsers(dto);
  }

  @Get('users/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[ADMIN] Get user details' })
  getUser(@GetUser() user: AuthUser, @Param('userId') userId: string) {
    return this.adminService.getUser(userId);
  }

  @Patch('users/:userId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[ADMIN] Update user status' })
  updateUserStatus(
    @GetUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(user.id, userId, dto);
  }

  @Patch('users/:userId/suspend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[ADMIN] Suspend user' })
  suspendUser(
    @GetUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.suspendUser(user.id, userId, reason);
  }

  @Patch('users/:userId/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[ADMIN] Activate user' })
  activateUser(@GetUser() user: AuthUser, @Param('userId') userId: string) {
    return this.adminService.activateUser(user.id, userId);
  }

  // SHOPS MANAGEMENT
  @Get('shops')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[ADMIN] List all shops' })
  listShops(
    @GetUser() user: AuthUser,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.listShops(
      user.id,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Patch('shops/:shopId/suspend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[ADMIN] Suspend shop' })
  suspendShop(
    @GetUser() user: AuthUser,
    @Param('shopId') shopId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.suspendShop(user.id, shopId, reason);
  }
}
