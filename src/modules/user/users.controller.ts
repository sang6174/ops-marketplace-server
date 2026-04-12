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
import { Permission } from '@common/constants/permissions';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { UsersService } from './users.service';
import { UpdateProfileDto, ChangePasswordDto, QueryUsersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/me
  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin cá nhân' })
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: AuthUser) {
    return this.usersService.getProfile(user.id);
  }

  // PATCH /users/me
  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  @UseGuards(JwtAuthGuard)
  updateProfile(@GetUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // PATCH /users/me/password
  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đổi mật khẩu' })
  @UseGuards(JwtAuthGuard)
  changePassword(@GetUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  // POST /users/me/become-seller
  @Post('me/become-seller')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng ký trở thành Seller' })
  @UseGuards(JwtAuthGuard)
  becomeSeller(@GetUser() user: AuthUser) {
    return this.usersService.becomeSeller(user.id);
  }

  // GET /users  (admin only)
  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.USER_READ)
  @ApiOperation({ summary: '[Admin] Danh sách users' })
  findAll(@Query() dto: QueryUsersDto) {
    return this.usersService.findAll(dto);
  }

  // PATCH /users/:id/status  (admin only)
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.USER_UPDATE)
  @ApiOperation({ summary: '[Admin] Cập nhật trạng thái user' })
  updateStatus(@Param('id') id: string, @Body('status') status: AccountStatus) {
    return this.usersService.updateStatus(id, status);
  }
}
