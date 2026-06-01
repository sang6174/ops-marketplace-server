// src/module/payment/payments.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingHttpHeaders } from 'http';
import { createHmac, timingSafeEqual } from 'crypto';
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
import { Prisma } from '@infrastructure/generated/prisma/client';
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
    if (
      dto.method === PaymentMethod.ONLINE &&
      dto.provider &&
      dto.provider !== PaymentProvider.STRIPE
    ) {
      throw new BadRequestException(
        'Stripe is the only supported online payment provider',
      );
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

    try {
      return await this.prisma.payment.create({
        data: {
          userId,
          amount: totalAmount.toString(),
          currency: 'VND',
          status: PaymentStatus.PENDING,
          method: dto.method,
          provider:
            dto.method === PaymentMethod.ONLINE
              ? PaymentProvider.STRIPE
              : undefined,
          items: {
            create: dto.orderIds.map((orderId) => ({
              orderId,
              amount: orders.find((order) => order.id === orderId)!.totalPrice,
            })),
          },
        },
        include: { items: true },
      });
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;

      const payment = await this.findPaymentForExactOrders(dto.orderIds);
      if (payment) return payment;
      throw error;
    }
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
          providers: [PaymentProvider.STRIPE],
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
    const event = this.normalizeStripeWebhookEvent(dto.payload);

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

  private verifyWebhookSignature(dto: {
    provider: PaymentProvider;
    payload: Record<string, unknown>;
    headers: IncomingHttpHeaders;
    rawBody?: Buffer;
  }) {
    if (dto.provider !== PaymentProvider.STRIPE) {
      throw new BadRequestException('Unsupported payment provider');
    }

    this.verifyStripeWebhook(dto.headers, dto.rawBody);
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

  private normalizeStripeWebhookEvent(payload: Record<string, unknown>) {
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
      const claimed = await tx.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.PENDING },
        data: {
          status,
          providerRef: providerRef ?? payment.providerRef,
        },
      });

      if (claimed.count === 0) {
        const current = await tx.payment.findFirst({
          where: { id: paymentId, deletedAt: null },
          include: { items: true },
        });
        if (!current) throw new ResourceNotFoundException('Payment', paymentId);
        return current;
      }

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

      const updatedPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { items: true },
      });
      if (!updatedPayment) {
        throw new ResourceNotFoundException('Payment', paymentId);
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
          balance: 0,
        },
        update: {},
      });

      const entryCreated = await this.createLedgerEntryIfMissing(tx, {
        accountId: account.id,
        amount: amount as string,
        type: LedgerEntryType.CREDIT,
        reference: paymentId,
        transactionId: paymentId,
        category: LedgerEntryCategory.PAYMENT,
      });

      if (entryCreated) {
        await tx.ledgerAccount.update({
          where: { id: account.id },
          data: { balance: { increment: Number(amount) } },
        });
      }
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
          balance: 0,
        },
        update: {},
      });

      const entryCreated = await this.createLedgerEntryIfMissing(tx, {
        accountId: account.id,
        amount: amount as string,
        type: LedgerEntryType.DEBIT,
        reference: refundId,
        transactionId: refundId,
        category: LedgerEntryCategory.REFUND,
      });

      if (entryCreated) {
        await tx.ledgerAccount.update({
          where: { id: account.id },
          data: { balance: { decrement: Number(amount) } },
        });
      }
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
        balance: 0,
      },
      update: {},
    });

    const entryCreated = await this.createLedgerEntryIfMissing(tx, {
      accountId: buyerAccount.id,
      amount: amount as string,
      type: LedgerEntryType.CREDIT,
      reference: refundId,
      transactionId: refundId,
      category: LedgerEntryCategory.REFUND,
    });

    if (entryCreated) {
      await tx.ledgerAccount.update({
        where: { id: buyerAccount.id },
        data: { balance: { increment: Number(amount) } },
      });
    }
  }

  private async findPaymentForExactOrders(orderIds: string[]) {
    const requestedOrderIds = [...new Set(orderIds)].sort();
    const payments = await this.prisma.payment.findMany({
      where: {
        deletedAt: null,
        items: { some: { orderId: { in: requestedOrderIds } } },
      },
      include: { items: true },
    });

    return (
      payments.find((payment) => {
        const paymentOrderIds = payment.items
          .map((item) => item.orderId)
          .sort();
        return (
          paymentOrderIds.length === requestedOrderIds.length &&
          paymentOrderIds.every(
            (orderId, index) => orderId === requestedOrderIds[index],
          )
        );
      }) ?? null
    );
  }

  private async createLedgerEntryIfMissing(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    data: Prisma.LedgerEntryCreateInput,
  ) {
    try {
      await tx.ledgerEntry.create({ data });
      return true;
    } catch (error) {
      if (this.isUniqueViolation(error)) return false;
      throw error;
    }
  }

  private isUniqueViolation(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
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
