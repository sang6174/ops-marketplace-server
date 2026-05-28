// src/module/payout/payout.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser, Roles } from '@common/decorators';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { UserRole } from '@infrastructure/generated/prisma/enums';
import { JwtAuthGuard } from '../auth/guards';
import { PayoutsService } from './payouts.service';
import {
  CreatePayoutDto,
  QueryPayoutsDto,
  BankAccountDto,
} from './dtos/payout.dto';

@ApiTags('Payouts')
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get seller balance' })
  getBalance(@GetUser() user: AuthUser) {
    return this.payoutsService.getSellerBalance(user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List seller payouts' })
  listPayouts(@GetUser() user: AuthUser, @Query() dto: QueryPayoutsDto) {
    return this.payoutsService.listPayouts(user.id, dto);
  }

  // Bank Account Endpoints
  @Get('bank-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List bank accounts' })
  listBankAccounts(@GetUser() user: AuthUser) {
    return this.payoutsService.listBankAccounts(user.id);
  }

  @Get('bank-accounts/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get bank account details' })
  getBankAccount(
    @Param('accountId') accountId: string,
    @GetUser() user: AuthUser,
  ) {
    return this.payoutsService.getBankAccount(accountId, user.id);
  }

  @Post('bank-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create bank account' })
  createBankAccount(@GetUser() user: AuthUser, @Body() dto: BankAccountDto) {
    return this.payoutsService.createBankAccount(user.id, dto);
  }

  @Patch('bank-accounts/:accountId/default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Set default bank account' })
  setDefaultBankAccount(
    @Param('accountId') accountId: string,
    @GetUser() user: AuthUser,
  ) {
    return this.payoutsService.setDefaultBankAccount(accountId, user.id);
  }

  @Delete('bank-accounts/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete bank account' })
  deleteBankAccount(
    @Param('accountId') accountId: string,
    @GetUser() user: AuthUser,
  ) {
    return this.payoutsService.deleteBankAccount(accountId, user.id);
  }

  @Get(':payoutId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get payout details' })
  getPayout(@Param('payoutId') payoutId: string, @GetUser() user: AuthUser) {
    return this.payoutsService.getPayout(payoutId, user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create payout request' })
  createPayout(@GetUser() user: AuthUser, @Body() dto: CreatePayoutDto) {
    return this.payoutsService.createPayout(user.id, dto);
  }
}

@ApiTags('Seller Payouts')
@ApiBearerAuth('JWT')
@Controller('seller')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SELLER)
export class SellerPayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('balance')
  @ApiOperation({ summary: '[SELLER] Get current balance' })
  getBalance(@GetUser() user: AuthUser) {
    return this.payoutsService.getSellerBalance(user.id);
  }

  @Get('balance/history')
  @ApiOperation({ summary: '[SELLER] Get balance history' })
  getBalanceHistory(@GetUser() user: AuthUser, @Query() dto: QueryPayoutsDto) {
    return this.payoutsService.getSellerBalanceHistory(user.id, dto);
  }

  @Post('payouts/request')
  @ApiOperation({ summary: '[SELLER] Request payout' })
  requestPayout(@GetUser() user: AuthUser, @Body() dto: CreatePayoutDto) {
    return this.payoutsService.createPayout(user.id, dto);
  }

  @Get('payouts')
  @ApiOperation({ summary: '[SELLER] List payouts' })
  listPayouts(@GetUser() user: AuthUser, @Query() dto: QueryPayoutsDto) {
    return this.payoutsService.listPayouts(user.id, dto);
  }

  @Get('payouts/:id')
  @ApiOperation({ summary: '[SELLER] Get payout detail' })
  getPayout(@GetUser() user: AuthUser, @Param('id') payoutId: string) {
    return this.payoutsService.getPayout(payoutId, user.id);
  }
}
