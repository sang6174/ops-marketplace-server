// src/module/payment/payments.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingHttpHeaders } from 'http';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import {
  LedgerAccountType,
  LedgerEntryCategory,
  LedgerEntryType,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  RefundStatus,
  UserRole,
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import { toPrismaPage } from '@common/utils';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import {
  ConfirmCodPaymentDto,
  CreatePaymentDto,
  QueryPaymentsDto,
  QueryRefundsDto,
  RejectRefundDto,
  RequestRefundDto,
  UpdatePaymentStatusDto,
} from './dtos/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async initiatePayment(userId: string, dto: CreatePaymentDto) {
    return this.createPayment(userId, dto);
  }

  async createPayment(userId: string, dto: CreatePaymentDto) {
    if (dto.method === PaymentMethod.ONLINE && !dto.provider) {
      throw new BadRequestException('Payment provider is required for ONLINE');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        id: { in: dto.orderIds },
        userId,
        deletedAt: null,
      },
    });

    if (orders.length !== dto.orderIds.length) {
      throw new BadRequestException(
        'One or more orders not found or do not belong to user',
      );
    }

    const unpaidOrders = orders.filter(
      (order) => order.paymentStatus === PaymentStatus.PENDING,
    );
    if (unpaidOrders.length !== orders.length) {
      throw new BadRequestException(
        'All orders must have PENDING payment status',
      );
    }

    const existingPayments = await this.prisma.payment.findMany({
      where: {
        deletedAt: null,
        items: { some: { orderId: { in: dto.orderIds } } },
        status: PaymentStatus.PENDING,
      },
      include: { items: true },
    });
    const requestedOrderIds = [...new Set(dto.orderIds)].sort();
    const existingPayment = existingPayments.find((payment) => {
      const paymentOrderIds = payment.items.map((item) => item.orderId).sort();
      return (
        paymentOrderIds.length === requestedOrderIds.length &&
        paymentOrderIds.every(
          (orderId, index) => orderId === requestedOrderIds[index],
        )
      );
    });
    if (existingPayment) return existingPayment;
    if (existingPayments.length) {
      throw new BadRequestException(
        'One or more orders already have a pending payment',
      );
    }

    const totalAmount = orders.reduce(
      (sum, order) => sum + Number(order.totalPrice),
      0,
    );

    return this.prisma.payment.create({
      data: {
        userId,
        amount: totalAmount.toString(),
        currency: 'VND',
        status: PaymentStatus.PENDING,
        method: dto.method,
        provider: dto.provider,
        idempotencyKey: randomUUID(),
        items: {
          create: dto.orderIds.map((orderId) => ({
            orderId,
            amount: orders.find((order) => order.id === orderId)!.totalPrice,
          })),
        },
      },
      include: { items: true },
    });
  }

  async getPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId, deletedAt: null },
      include: { items: { include: { order: true } } },
    });

    if (!payment) {
      throw new ResourceNotFoundException('Payment', paymentId);
    }

    return payment;
  }

  async getPaymentByOrder(userId: string, orderId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        userId,
        deletedAt: null,
        items: { some: { orderId } },
      },
      include: { items: { include: { order: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new ResourceNotFoundException('Payment for order', orderId);
    }

    return payment;
  }

  async listPayments(userId: string, dto: QueryPaymentsDto) {
    const { page = 1, limit = 20, status, method } = dto;
    const where = {
      userId,
      deletedAt: null,
      ...(status && { status }),
      ...(method && { method }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  getPaymentMethods() {
    return {
      methods: [
        {
          method: PaymentMethod.COD,
          providers: [],
        },
        {
          method: PaymentMethod.ONLINE,
          providers: [
            PaymentProvider.MOMO,
            PaymentProvider.STRIPE,
            PaymentProvider.PAYPAL,
          ],
        },
      ],
      currency: 'VND',
    };
  }

  async updatePaymentStatus(
    user: AuthUser,
    paymentId: string,
    dto: UpdatePaymentStatusDto,
  ) {
    const payment = user.roles.includes(UserRole.ADMIN)
      ? await this.getPaymentById(paymentId)
      : await this.getPayment(user.id, paymentId);
    return this.applyPaymentStatus(payment.id, dto.status, dto.providerRef);
  }

  async processPayment(user: AuthUser, paymentId: string, providerRef: string) {
    const payment = user.roles.includes(UserRole.ADMIN)
      ? await this.getPaymentById(paymentId)
      : await this.getPayment(user.id, paymentId);

    if (payment.method === PaymentMethod.COD) {
      throw new BadRequestException(
        'Cannot process COD payments via this endpoint',
      );
    }

    return this.applyPaymentStatus(
      payment.id,
      PaymentStatus.SUCCESS,
      providerRef,
    );
  }

  async cancelPayment(userId: string, paymentId: string) {
    const payment = await this.getPayment(userId, paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Can only cancel PENDING payments');
    }

    return this.applyPaymentStatus(payment.id, PaymentStatus.FAILED);
  }

  private async getPaymentById(paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
      include: { items: { include: { order: true } } },
    });

    if (!payment) throw new ResourceNotFoundException('Payment', paymentId);
    return payment;
  }

  async handleProviderWebhook(dto: {
    provider: PaymentProvider;
    payload: Record<string, unknown>;
    headers: IncomingHttpHeaders;
    rawBody?: Buffer;
  }) {
    await this.verifyWebhookSignature(dto);
    const event = this.normalizeWebhookEvent(dto.provider, dto.payload);

    if (!event.paymentId && !event.providerRef) {
      throw new BadRequestException('paymentId or providerRef is required');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        deletedAt: null,
        provider: dto.provider,
        ...(event.paymentId && { id: event.paymentId }),
        ...(event.providerRef && { providerRef: event.providerRef }),
      },
    });

    if (!payment) {
      throw new ResourceNotFoundException('Payment webhook target');
    }

    return this.applyPaymentStatus(payment.id, event.status, event.providerRef);
  }

  private async verifyWebhookSignature(dto: {
    provider: PaymentProvider;
    payload: Record<string, unknown>;
    headers: IncomingHttpHeaders;
    rawBody?: Buffer;
  }) {
    if (dto.provider === PaymentProvider.STRIPE) {
      this.verifyStripeWebhook(dto.headers, dto.rawBody);
      return;
    }

    if (dto.provider === PaymentProvider.MOMO) {
      this.verifyMomoWebhook(dto.payload);
      return;
    }

    await this.verifyPaypalWebhook(dto.headers, dto.payload);
  }

  private verifyStripeWebhook(headers: IncomingHttpHeaders, rawBody?: Buffer) {
    const webhookSecret = this.configService.get<string>(
      'payment.stripe.webhookSecret',
    );
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }
    if (!rawBody) {
      throw new BadRequestException('Stripe raw body is required');
    }

    const signatureHeader = this.getHeader(headers, 'stripe-signature');
    if (!signatureHeader) {
      throw new BadRequestException('Stripe signature header is missing');
    }

    const parts = signatureHeader
      .split(',')
      .reduce<Record<string, string[]>>((mapped, part) => {
        const [key, value] = part.split('=');
        if (!key || !value) return mapped;
        mapped[key] = [...(mapped[key] ?? []), value];
        return mapped;
      }, {});
    const timestamp = parts.t?.[0];
    const signatures = parts.v1 ?? [];
    if (!timestamp || signatures.length === 0) {
      throw new BadRequestException('Stripe signature header is invalid');
    }

    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expected = createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');
    const matched = signatures.some((signature) =>
      this.safeCompare(signature, expected),
    );
    if (!matched) {
      throw new BadRequestException('Stripe signature verification failed');
    }
  }

  private verifyMomoWebhook(payload: Record<string, unknown>) {
    const accessKey = this.configService.get<string>('payment.momo.accessKey');
    const secretKey = this.configService.get<string>('payment.momo.secretKey');
    if (!accessKey || !secretKey) {
      throw new BadRequestException('MoMo webhook keys are not configured');
    }

    const signature = this.getString(payload.signature);
    if (!signature) {
      throw new BadRequestException('MoMo signature is missing');
    }

    const rawSignature = [
      ['accessKey', accessKey],
      ['amount', payload.amount],
      ['extraData', payload.extraData],
      ['message', payload.message],
      ['orderId', payload.orderId],
      ['orderInfo', payload.orderInfo],
      ['orderType', payload.orderType],
      ['partnerCode', payload.partnerCode],
      ['payType', payload.payType],
      ['requestId', payload.requestId],
      ['responseTime', payload.responseTime],
      ['resultCode', payload.resultCode],
      ['transId', payload.transId],
    ]
      .map(([key, value]) => `${key}=${this.getString(value) ?? ''}`)
      .join('&');

    const expected = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');
    if (!this.safeCompare(signature, expected)) {
      throw new BadRequestException('MoMo signature verification failed');
    }
  }

  private async verifyPaypalWebhook(
    headers: IncomingHttpHeaders,
    payload: Record<string, unknown>,
  ) {
    const webhookId = this.configService.get<string>(
      'payment.paypal.webhookId',
    );
    const clientId = this.configService.get<string>('payment.paypal.clientId');
    const clientSecret = this.configService.get<string>(
      'payment.paypal.clientSecret',
    );
    const apiBaseUrl = this.configService.get<string>(
      'payment.paypal.apiBaseUrl',
      'https://api-m.sandbox.paypal.com',
    );
    if (!webhookId || !clientId || !clientSecret) {
      throw new BadRequestException(
        'PayPal webhook credentials are not configured',
      );
    }

    const transmissionId = this.getHeader(headers, 'paypal-transmission-id');
    const transmissionTime = this.getHeader(
      headers,
      'paypal-transmission-time',
    );
    const transmissionSig = this.getHeader(headers, 'paypal-transmission-sig');
    const certUrl = this.getHeader(headers, 'paypal-cert-url');
    const authAlgo = this.getHeader(headers, 'paypal-auth-algo');
    if (
      !transmissionId ||
      !transmissionTime ||
      !transmissionSig ||
      !certUrl ||
      !authAlgo
    ) {
      throw new BadRequestException('PayPal signature headers are incomplete');
    }

    const accessToken = await this.getPaypalAccessToken(
      apiBaseUrl,
      clientId,
      clientSecret,
    );
    const response = await fetch(
      `${apiBaseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: payload,
        }),
      },
    );
    if (!response.ok) {
      throw new BadRequestException('PayPal signature verification failed');
    }

    const result = (await response.json()) as {
      verification_status?: string;
    };
    if (result.verification_status !== 'SUCCESS') {
      throw new BadRequestException('PayPal signature verification failed');
    }
  }

  private async getPaypalAccessToken(
    apiBaseUrl: string,
    clientId: string,
    clientSecret: string,
  ) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );
    const response = await fetch(`${apiBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new BadRequestException('Cannot get PayPal access token');
    }

    const token = (await response.json()) as { access_token?: string };
    if (!token.access_token) {
      throw new BadRequestException('PayPal access token is missing');
    }
    return token.access_token;
  }

  private normalizeWebhookEvent(
    provider: PaymentProvider,
    payload: Record<string, unknown>,
  ) {
    if (provider === PaymentProvider.STRIPE) {
      const data = this.getRecord(payload.data);
      const object = this.getRecord(data?.object);
      const metadata = this.getRecord(object?.metadata);
      return {
        paymentId: this.getString(metadata?.paymentId),
        providerRef: this.getString(object?.id),
        status: this.stripeStatusToPaymentStatus(
          this.getString(object?.payment_status) ??
            this.getString(object?.status) ??
            this.getString(payload.type),
        ),
      };
    }

    if (provider === PaymentProvider.MOMO) {
      return {
        paymentId:
          this.getString(payload.paymentId) ?? this.getString(payload.orderId),
        providerRef: this.getString(payload.transId),
        status:
          this.getString(payload.resultCode) === '0'
            ? PaymentStatus.SUCCESS
            : PaymentStatus.FAILED,
      };
    }

    const resource = this.getRecord(payload.resource);
    return {
      paymentId:
        this.getString(resource?.custom_id) ??
        this.getString(resource?.invoice_id) ??
        this.getString(payload.paymentId),
      providerRef:
        this.getString(resource?.id) ?? this.getString(payload.providerRef),
      status: this.paypalStatusToPaymentStatus(
        this.getString(resource?.status) ?? this.getString(payload.event_type),
      ),
    };
  }

  private stripeStatusToPaymentStatus(status?: string) {
    if (
      status === 'paid' ||
      status === 'succeeded' ||
      status === 'checkout.session.completed'
    ) {
      return PaymentStatus.SUCCESS;
    }
    if (status === 'failed' || status === 'payment_intent.payment_failed') {
      return PaymentStatus.FAILED;
    }
    return PaymentStatus.PENDING;
  }

  private paypalStatusToPaymentStatus(status?: string) {
    if (status === 'COMPLETED' || status === 'PAYMENT.CAPTURE.COMPLETED') {
      return PaymentStatus.SUCCESS;
    }
    if (
      status === 'DECLINED' ||
      status === 'FAILED' ||
      status === 'PAYMENT.CAPTURE.DENIED'
    ) {
      return PaymentStatus.FAILED;
    }
    return PaymentStatus.PENDING;
  }

  private getHeader(headers: IncomingHttpHeaders, name: string) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  private getRecord(value: unknown) {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private getString(value: unknown) {
    if (value === undefined || value === null) return undefined;
    return String(value);
  }

  private safeCompare(actual: string, expected: string) {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  async confirmCodPayment(user: AuthUser, dto: ConfirmCodPaymentDto) {
    if (!dto.paymentId && !dto.orderId) {
      throw new BadRequestException('paymentId or orderId is required');
    }

    const payment = dto.paymentId
      ? await this.getCollectableCodPayment(user, dto.paymentId)
      : await this.getCollectableCodPaymentByOrder(user, dto.orderId!);

    if (payment.method !== PaymentMethod.COD) {
      throw new BadRequestException('Only COD payment can be confirmed here');
    }

    return this.applyPaymentStatus(payment.id, PaymentStatus.SUCCESS);
  }

  async collectCodPayment(user: AuthUser, paymentId: string) {
    const payment = await this.getCollectableCodPayment(user, paymentId);
    if (payment.method !== PaymentMethod.COD) {
      throw new BadRequestException('Only COD payment can be collected here');
    }

    return this.applyPaymentStatus(payment.id, PaymentStatus.SUCCESS);
  }

  async requestRefund(userId: string, dto: RequestRefundDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        userId,
        deletedAt: null,
      },
    });

    if (!order) throw new ResourceNotFoundException('Order', dto.orderId);
    if (order.paymentStatus !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        orderId: order.id,
        userId,
        deletedAt: null,
        status: {
          in: [
            RefundStatus.REQUESTED,
            RefundStatus.APPROVED,
            RefundStatus.REFUNDED,
          ],
        },
      },
    });
    if (existingRefund) {
      throw new BadRequestException('Refund request already exists');
    }

    const amount = dto.amount ?? order.totalPrice.toString();
    if (Number(amount) <= 0 || Number(amount) > Number(order.totalPrice)) {
      throw new BadRequestException('Invalid refund amount');
    }

    return this.prisma.refund.create({
      data: {
        userId,
        orderId: order.id,
        shopId: order.shopId,
        amount,
        reason: dto.reason,
        status: RefundStatus.REQUESTED,
      },
      include: { order: true },
    });
  }

  async listRefunds(userId: string, dto: QueryRefundsDto) {
    const { page = 1, limit = 20, status } = dto;
    const where = {
      userId,
      deletedAt: null,
      ...(status && { status }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.refund.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
        include: { order: true },
      }),
      this.prisma.refund.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async getRefund(userId: string, refundId: string) {
    const refund = await this.prisma.refund.findFirst({
      where: { id: refundId, userId, deletedAt: null },
      include: { order: true },
    });

    if (!refund) throw new ResourceNotFoundException('Refund', refundId);
    return refund;
  }

  async listSellerRefunds(userId: string, dto: QueryRefundsDto) {
    const shop = await this.getSellerShop(userId);
    const { page = 1, limit = 20, status } = dto;
    const where = {
      shopId: shop.id,
      deletedAt: null,
      ...(status && { status }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.refund.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
        include: { order: true, user: { select: { id: true, name: true } } },
      }),
      this.prisma.refund.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async approveSellerRefund(userId: string, refundId: string) {
    const shop = await this.getSellerShop(userId);
    const refund = await this.getRefundForShop(refundId, shop.id);

    if (refund.status !== RefundStatus.REQUESTED) {
      throw new BadRequestException('Only REQUESTED refunds can be approved');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.REFUNDED,
          processedAt: new Date(),
        },
        include: { order: true },
      });

      await tx.order.update({
        where: { id: refund.orderId },
        data: { paymentStatus: PaymentStatus.FAILED },
      });

      await this.recordRefundLedgerEntries(
        tx,
        refund.order.userId,
        refund.shopId,
        refund.amount,
        refund.id,
      );

      return updated;
    });
  }

  async rejectSellerRefund(
    userId: string,
    refundId: string,
    dto: RejectRefundDto,
  ) {
    const shop = await this.getSellerShop(userId);
    const refund = await this.getRefundForShop(refundId, shop.id);

    if (refund.status !== RefundStatus.REQUESTED) {
      throw new BadRequestException('Only REQUESTED refunds can be rejected');
    }

    return this.prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: RefundStatus.REJECTED,
        rejectedReason: dto.reason,
        processedAt: new Date(),
      },
      include: { order: true },
    });
  }

  private async applyPaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    providerRef?: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
      include: { items: { include: { order: true } } },
    });

    if (!payment) throw new ResourceNotFoundException('Payment', paymentId);
    if (payment.status !== PaymentStatus.PENDING) return payment;

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          providerRef: providerRef ?? payment.providerRef,
        },
        include: { items: true },
      });

      await tx.order.updateMany({
        where: { id: { in: payment.items.map((item) => item.orderId) } },
        data: { paymentStatus: status },
      });

      if (status === PaymentStatus.SUCCESS) {
        for (const item of payment.items) {
          await this.creditSellerBalance(
            tx,
            item.order.shopId,
            item.amount,
            payment.id,
          );
        }
      }

      return updatedPayment;
    });
  }

  private async creditSellerBalance(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    shopId: string,
    amount: unknown,
    paymentId: string,
  ) {
    const shop = await tx.shop.findUnique({ where: { id: shopId } });
    if (!shop) return;

    for (const type of [
      LedgerAccountType.SELLER_BALANCE,
      LedgerAccountType.SELLER_AVAILABLE,
    ]) {
      const account = await tx.ledgerAccount.upsert({
        where: {
          ownerId_type: {
            ownerId: shop.ownerId,
            type,
          },
        },
        create: {
          ownerId: shop.ownerId,
          type,
          balance: amount as string,
        },
        update: {
          balance: { increment: Number(amount) },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          amount: amount as string,
          type: LedgerEntryType.CREDIT,
          reference: paymentId,
          transactionId: paymentId,
          category: LedgerEntryCategory.PAYMENT,
        },
      });
    }
  }

  private async recordRefundLedgerEntries(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    buyerId: string,
    shopId: string,
    amount: unknown,
    refundId: string,
  ) {
    const shop = await tx.shop.findUnique({ where: { id: shopId } });
    if (!shop) return;

    const availableAccount = await tx.ledgerAccount.findUnique({
      where: {
        ownerId_type: {
          ownerId: shop.ownerId,
          type: LedgerAccountType.SELLER_AVAILABLE,
        },
      },
    });
    if (Number(availableAccount?.balance ?? 0) < Number(amount)) {
      throw new BadRequestException(
        'Seller available balance is insufficient for refund',
      );
    }

    for (const type of [
      LedgerAccountType.SELLER_BALANCE,
      LedgerAccountType.SELLER_AVAILABLE,
    ]) {
      const account = await tx.ledgerAccount.upsert({
        where: {
          ownerId_type: {
            ownerId: shop.ownerId,
            type,
          },
        },
        create: {
          ownerId: shop.ownerId,
          type,
          balance: -Number(amount),
        },
        update: {
          balance: { decrement: Number(amount) },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          amount: amount as string,
          type: LedgerEntryType.DEBIT,
          reference: refundId,
          transactionId: refundId,
          category: LedgerEntryCategory.REFUND,
        },
      });
    }

    const buyerAccount = await tx.ledgerAccount.upsert({
      where: {
        ownerId_type: {
          ownerId: buyerId,
          type: LedgerAccountType.BUYER_WALLET,
        },
      },
      create: {
        ownerId: buyerId,
        type: LedgerAccountType.BUYER_WALLET,
        balance: amount as string,
      },
      update: {
        balance: { increment: Number(amount) },
      },
    });

    await tx.ledgerEntry.create({
      data: {
        accountId: buyerAccount.id,
        amount: amount as string,
        type: LedgerEntryType.CREDIT,
        reference: refundId,
        transactionId: refundId,
        category: LedgerEntryCategory.REFUND,
      },
    });
  }

  private async getSellerShop(userId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });

    if (!shop) throw new ResourceNotFoundException('Shop');
    return shop;
  }

  private async getRefundForShop(refundId: string, shopId: string) {
    const refund = await this.prisma.refund.findFirst({
      where: { id: refundId, shopId, deletedAt: null },
      include: { order: true },
    });

    if (!refund) throw new ResourceNotFoundException('Refund', refundId);
    return refund;
  }

  private async getCollectableCodPayment(user: AuthUser, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
      include: { items: { include: { order: true } } },
    });

    if (!payment) throw new ResourceNotFoundException('Payment', paymentId);
    await this.assertCanCollectPayment(user, payment);
    return payment;
  }

  private async getCollectableCodPaymentByOrder(
    user: AuthUser,
    orderId: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        deletedAt: null,
        items: { some: { orderId } },
      },
      include: { items: { include: { order: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new ResourceNotFoundException('Payment for order', orderId);
    }

    await this.assertCanCollectPayment(user, payment);
    return payment;
  }

  private async assertCanCollectPayment(
    user: AuthUser,
    payment: Awaited<ReturnType<PaymentsService['getCollectableCodPayment']>>,
  ) {
    if (user.roles.includes(UserRole.ADMIN)) return;

    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!shop) throw new ResourceNotFoundException('Shop');

    const ownsEveryOrder = payment.items.every(
      (item) => item.order.shopId === shop.id,
    );
    if (!ownsEveryOrder) {
      throw new BadRequestException('Payment does not belong to your shop');
    }
  }
}
