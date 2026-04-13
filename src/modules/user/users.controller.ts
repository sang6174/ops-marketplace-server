import {
  Controller,
  HttpCode,
  HttpStatus,
  Get,
  Post,
  Patch,
  Query,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccountStatus,
  UserRole,
} from '@infrastructure/generated/prisma/enums';
import { GetUser, Roles, Permissions } from '@common/decorators';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  QueryUsersDto,
  UpdateUserStatusDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/me
  @Get('me')
  @ApiOperation({ summary: "Get user's info" })
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: AuthUser) {
    return this.usersService.getProfile(user.id);
  }

  // PATCH /users/me
  @Patch('me')
  @ApiOperation({ summary: "Update user's info" })
  @UseGuards(JwtAuthGuard)
  updateProfile(@GetUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // PATCH /users/me/password
  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @UseGuards(JwtAuthGuard)
  changePassword(@GetUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  // POST /users/me/become-seller
  @Post('me/become-seller')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[BUYER] Register as a seller' })
  @UseGuards(JwtAuthGuard)
  becomeSeller(@GetUser() user: AuthUser) {
    return this.usersService.becomeSeller(user.id);
  }

  // GET /users  (admin only)
  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Get user list' })
  findAll(@Query() dto: QueryUsersDto) {
    return this.usersService.findAll(dto);
  }

  // PATCH /users/:id/status  (admin only)
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Update status of the user' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto.status);
  }
}
