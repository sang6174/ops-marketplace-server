// src/module/payment/payments.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import {
  PaymentStatus,
  PaymentMethod,
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import { toPrismaPage } from '@common/utils';
import {
  CreatePaymentDto,
  UpdatePaymentStatusDto,
  QueryPaymentsDto,
} from './dtos/payment.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(userId: string, dto: CreatePaymentDto) {
    // Validate orders exist and belong to user
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

    // Calculate total amount from orders
    const totalAmount = orders.reduce(
      (sum, order) => sum + Number(order.totalPrice),
      0,
    );

    // Check if orders are already paid
    const unpaidOrders = orders.filter(
      (o) => o.paymentStatus === PaymentStatus.PENDING,
    );
    if (unpaidOrders.length !== orders.length) {
      throw new BadRequestException(
        'All orders must have PENDING payment status',
      );
    }

    // Generate idempotency key
    const idempotencyKey = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          userId,
          amount: totalAmount.toString(),
          currency: 'VND',
          status: PaymentStatus.PENDING,
          method: dto.method,
          provider: dto.provider,
          idempotencyKey,

          items: {
            create: dto.orderIds.map((orderId) => ({
              orderId,
              amount: orders.find((o) => o.id === orderId)!.totalPrice,
            })),
          },
        },
        include: { items: true },
      });

      // Update order payment status if method is COD
      if (dto.method === PaymentMethod.COD) {
        await tx.order.updateMany({
          where: { id: { in: dto.orderIds } },
          data: { paymentStatus: PaymentStatus.SUCCESS },
        });
      }

      return payment;
    });
  }

  async getPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId, deletedAt: null },
      include: { items: true },
    });

    if (!payment) {
      throw new ResourceNotFoundException('Payment', paymentId);
    }

    return payment;
  }

  async listPayments(userId: string, dto: QueryPaymentsDto) {
    const { page = 1, limit = 20, status, method } = dto;

    const where: any = {
      userId,
      isDeleted: false,
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

  async updatePaymentStatus(
    userId: string,
    paymentId: string,
    dto: UpdatePaymentStatusDto,
  ) {
    const payment = await this.getPayment(userId, paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        'Can only update status for PENDING payments',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Update payment
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: dto.status,
          providerRef: dto.providerRef,
        },
        include: { items: true },
      });

      // Update associated orders' payment status
      if (dto.status === PaymentStatus.SUCCESS) {
        await tx.order.updateMany({
          where: {
            id: { in: payment.items.map((item) => item.orderId) },
          },
          data: { paymentStatus: PaymentStatus.SUCCESS },
        });
      } else if (dto.status === PaymentStatus.FAILED) {
        await tx.order.updateMany({
          where: {
            id: { in: payment.items.map((item) => item.orderId) },
          },
          data: { paymentStatus: PaymentStatus.FAILED },
        });
      }

      return updatedPayment;
    });
  }

  async processPayment(userId: string, paymentId: string, providerRef: string) {
    const payment = await this.getPayment(userId, paymentId);

    if (payment.method === PaymentMethod.COD) {
      throw new BadRequestException(
        'Cannot process COD payments via this endpoint',
      );
    }

    // Simulate payment processing
    // In production, this would call actual payment provider API
    return this.updatePaymentStatus(userId, paymentId, {
      status: PaymentStatus.SUCCESS,
      providerRef,
    });
  }

  async cancelPayment(userId: string, paymentId: string) {
    const payment = await this.getPayment(userId, paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Can only cancel PENDING payments');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        deletedAt: new Date(),
      },
      include: { items: true },
    });
  }

  async getPaymentByIdempotencyKey(userId: string, idempotencyKey: string) {
    return this.prisma.payment.findFirst({
      where: {
        userId,
        idempotencyKey,
        deletedAt: null,
      },
      include: { items: true },
    });
  }
}
