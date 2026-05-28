// src/module/payment/payments.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
  PaymentWebhookDto,
  QueryPaymentsDto,
  QueryRefundsDto,
  RejectRefundDto,
  RequestRefundDto,
  UpdatePaymentStatusDto,
} from './dtos/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async handleProviderWebhook(
    provider: PaymentProvider,
    dto: PaymentWebhookDto,
  ) {
    if (!dto.paymentId && !dto.providerRef) {
      throw new BadRequestException('paymentId or providerRef is required');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        deletedAt: null,
        provider,
        ...(dto.paymentId && { id: dto.paymentId }),
        ...(dto.providerRef && { providerRef: dto.providerRef }),
      },
    });

    if (!payment) {
      throw new ResourceNotFoundException('Payment webhook target');
    }

    return this.applyPaymentStatus(
      payment.id,
      dto.status ?? PaymentStatus.SUCCESS,
      dto.providerRef,
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
