import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { UsersService } from './users.service';
import {
  CreateUserAddressDto,
  CreateUserBankAccountDto,
  UpdateProfileDto,
  UpdateUserAddressDto,
  UpdateUserBankAccountDto,
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

  // PUT /users/me
  @Put('me')
  @ApiOperation({ summary: "Update user's info" })
  @UseGuards(JwtAuthGuard)
  updateProfile(@GetUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // DELETE /users/me
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Soft delete user's account" })
  @UseGuards(JwtAuthGuard)
  deleteAccount(@GetUser() user: AuthUser) {
    return this.usersService.deleteAccount(user.id);
  }

  // GET /users/me/sessions
  @Get('me/sessions')
  @ApiOperation({ summary: "List user's active sessions" })
  @UseGuards(JwtAuthGuard)
  listActiveSessions(@GetUser() user: AuthUser) {
    return this.usersService.listActiveSessions(user.id);
  }

  // DELETE /users/me/sessions/:id
  @Delete('me/sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an active session' })
  @UseGuards(JwtAuthGuard)
  revokeSession(@GetUser() user: AuthUser, @Param('id') sessionId: string) {
    return this.usersService.revokeSession(user.id, sessionId);
  }

  // POST /users/me/become-seller
  @Post('me/become-seller')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[BUYER] Register as a seller' })
  @UseGuards(JwtAuthGuard)
  becomeSeller(@GetUser() user: AuthUser) {
    return this.usersService.becomeSeller(user.id);
  }

  // GET /users/addresses
  @Get('addresses')
  @ApiOperation({ summary: "List user's addresses" })
  @UseGuards(JwtAuthGuard)
  listAddresses(@GetUser() user: AuthUser) {
    return this.usersService.listAddresses(user.id);
  }

  // POST /users/addresses
  @Post('addresses')
  @ApiOperation({ summary: 'Create address' })
  @UseGuards(JwtAuthGuard)
  createAddress(@GetUser() user: AuthUser, @Body() dto: CreateUserAddressDto) {
    return this.usersService.createAddress(user.id, dto);
  }

  // PUT /users/addresses/:id
  @Put('addresses/:id')
  @ApiOperation({ summary: 'Update address' })
  @UseGuards(JwtAuthGuard)
  updateAddress(
    @GetUser() user: AuthUser,
    @Param('id') addressId: string,
    @Body() dto: UpdateUserAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, addressId, dto);
  }

  // DELETE /users/addresses/:id
  @Delete('addresses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete address' })
  @UseGuards(JwtAuthGuard)
  deleteAddress(@GetUser() user: AuthUser, @Param('id') addressId: string) {
    return this.usersService.deleteAddress(user.id, addressId);
  }

  // PUT /users/addresses/:id/default
  @Put('addresses/:id/default')
  @ApiOperation({ summary: 'Set default address' })
  @UseGuards(JwtAuthGuard)
  setDefaultAddress(@GetUser() user: AuthUser, @Param('id') addressId: string) {
    return this.usersService.setDefaultAddress(user.id, addressId);
  }

  // GET /users/bank-accounts
  @Get('bank-accounts')
  @ApiOperation({ summary: "List user's bank accounts" })
  @UseGuards(JwtAuthGuard)
  listBankAccounts(@GetUser() user: AuthUser) {
    return this.usersService.listBankAccounts(user.id);
  }

  // POST /users/bank-accounts
  @Post('bank-accounts')
  @ApiOperation({ summary: 'Create bank account' })
  @UseGuards(JwtAuthGuard)
  createBankAccount(
    @GetUser() user: AuthUser,
    @Body() dto: CreateUserBankAccountDto,
  ) {
    return this.usersService.createBankAccount(user.id, dto);
  }

  // PUT /users/bank-accounts/:id
  @Put('bank-accounts/:id')
  @ApiOperation({ summary: 'Update bank account' })
  @UseGuards(JwtAuthGuard)
  updateBankAccount(
    @GetUser() user: AuthUser,
    @Param('id') accountId: string,
    @Body() dto: UpdateUserBankAccountDto,
  ) {
    return this.usersService.updateBankAccount(user.id, accountId, dto);
  }

  // DELETE /users/bank-accounts/:id
  @Delete('bank-accounts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete bank account' })
  @UseGuards(JwtAuthGuard)
  deleteBankAccount(@GetUser() user: AuthUser, @Param('id') accountId: string) {
    return this.usersService.deleteBankAccount(user.id, accountId);
  }

  // PUT /users/bank-accounts/:id/default
  @Put('bank-accounts/:id/default')
  @ApiOperation({ summary: 'Set default bank account' })
  @UseGuards(JwtAuthGuard)
  setDefaultBankAccount(
    @GetUser() user: AuthUser,
    @Param('id') accountId: string,
  ) {
    return this.usersService.setDefaultBankAccount(user.id, accountId);
  }
}
