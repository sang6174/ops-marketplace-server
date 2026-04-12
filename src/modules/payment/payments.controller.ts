// src/module/payment/payments.controller.ts
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
import { GetUser } from '@common/decorators';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { JwtAuthGuard } from '../auth/guards';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  UpdatePaymentStatusDto,
  QueryPaymentsDto,
} from './dtos/payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create payment for orders' })
  createPayment(@GetUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List user payments' })
  listPayments(@GetUser() user: AuthUser, @Query() dto: QueryPaymentsDto) {
    return this.paymentsService.listPayments(user.id, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get payment details' })
  getPayment(@GetUser() user: AuthUser, @Param('id') paymentId: string) {
    return this.paymentsService.getPayment(user.id, paymentId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update payment status' })
  updatePaymentStatus(
    @GetUser() user: AuthUser,
    @Param('id') paymentId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updatePaymentStatus(user.id, paymentId, dto);
  }

  @Post(':id/process')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Process online payment' })
  processPayment(
    @GetUser() user: AuthUser,
    @Param('id') paymentId: string,
    @Body('providerRef') providerRef: string,
  ) {
    return this.paymentsService.processPayment(user.id, paymentId, providerRef);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cancel payment' })
  cancelPayment(@GetUser() user: AuthUser, @Param('id') paymentId: string) {
    return this.paymentsService.cancelPayment(user.id, paymentId);
  }
}
