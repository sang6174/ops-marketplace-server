// src/module/payment/payments.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public, GetUser, Roles } from '@common/decorators';
import {
  UserRole,
  PaymentProvider,
} from '@infrastructure/generated/prisma/enums';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { JwtAuthGuard } from '../auth/guards';
import { PaymentsService } from './payments.service';
import {
  ConfirmCodPaymentDto,
  CreatePaymentDto,
  QueryPaymentsDto,
  QueryRefundsDto,
  RejectRefundDto,
  RequestRefundDto,
  UpdatePaymentStatusDto,
} from './dtos/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate payment' })
  initiatePayment(@GetUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.initiatePayment(user.id, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create payment for orders' })
  createPayment(@GetUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user payments' })
  listPayments(@GetUser() user: AuthUser, @Query() dto: QueryPaymentsDto) {
    return this.paymentsService.listPayments(user.id, dto);
  }

  @Get('methods')
  @ApiOperation({ summary: 'Get available payment methods' })
  getPaymentMethods() {
    return this.paymentsService.getPaymentMethods();
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment by order' })
  getPaymentByOrder(
    @GetUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.getPaymentByOrder(user.id, orderId);
  }

  @Post('cod/confirm')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Confirm COD payment' })
  confirmCodPayment(
    @GetUser() user: AuthUser,
    @Body() dto: ConfirmCodPaymentDto,
  ) {
    return this.paymentsService.confirmCodPayment(user, dto);
  }

  @Put('cod/:id/collect')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark COD payment as collected' })
  collectCodPayment(@GetUser() user: AuthUser, @Param('id') paymentId: string) {
    return this.paymentsService.collectCodPayment(user, paymentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details' })
  getPayment(@GetUser() user: AuthUser, @Param('id') paymentId: string) {
    return this.paymentsService.getPayment(user.id, paymentId);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update payment status' })
  updatePaymentStatus(
    @GetUser() user: AuthUser,
    @Param('id') paymentId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updatePaymentStatus(user, paymentId, dto);
  }

  @Post(':id/process')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Process online payment' })
  processPayment(
    @GetUser() user: AuthUser,
    @Param('id') paymentId: string,
    @Body('providerRef') providerRef: string,
  ) {
    return this.paymentsService.processPayment(user, paymentId, providerRef);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel payment' })
  cancelPayment(@GetUser() user: AuthUser, @Param('id') paymentId: string) {
    return this.paymentsService.cancelPayment(user.id, paymentId);
  }
}

@ApiTags('Payment Webhooks')
@Controller('webhooks')
export class PaymentWebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('momo')
  @ApiOperation({ summary: 'MoMo payment webhook' })
  handleMomoWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.paymentsService.handleProviderWebhook({
      provider: PaymentProvider.MOMO,
      payload,
      headers: request.headers,
      rawBody: request.rawBody,
    });
  }

  @Public()
  @Post('stripe')
  @ApiOperation({ summary: 'Stripe payment webhook' })
  handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.paymentsService.handleProviderWebhook({
      provider: PaymentProvider.STRIPE,
      payload,
      headers: request.headers,
      rawBody: request.rawBody,
    });
  }

  @Public()
  @Post('paypal')
  @ApiOperation({ summary: 'PayPal payment webhook' })
  handlePaypalWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.paymentsService.handleProviderWebhook({
      provider: PaymentProvider.PAYPAL,
      payload,
      headers: request.headers,
      rawBody: request.rawBody,
    });
  }
}

@ApiTags('Refunds')
@ApiBearerAuth('JWT')
@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request refund' })
  requestRefund(@GetUser() user: AuthUser, @Body() dto: RequestRefundDto) {
    return this.paymentsService.requestRefund(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List refund requests' })
  listRefunds(@GetUser() user: AuthUser, @Query() dto: QueryRefundsDto) {
    return this.paymentsService.listRefunds(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get refund request detail' })
  getRefund(@GetUser() user: AuthUser, @Param('id') refundId: string) {
    return this.paymentsService.getRefund(user.id, refundId);
  }
}

@ApiTags('Seller Refunds')
@ApiBearerAuth('JWT')
@Controller('seller/refunds')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SELLER)
export class SellerRefundsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: '[SELLER] List shop refund requests' })
  listSellerRefunds(@GetUser() user: AuthUser, @Query() dto: QueryRefundsDto) {
    return this.paymentsService.listSellerRefunds(user.id, dto);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: '[SELLER] Approve refund request' })
  approveRefund(@GetUser() user: AuthUser, @Param('id') refundId: string) {
    return this.paymentsService.approveSellerRefund(user.id, refundId);
  }

  @Put(':id/reject')
  @ApiOperation({ summary: '[SELLER] Reject refund request' })
  rejectRefund(
    @GetUser() user: AuthUser,
    @Param('id') refundId: string,
    @Body() dto: RejectRefundDto,
  ) {
    return this.paymentsService.rejectSellerRefund(user.id, refundId, dto);
  }
}
