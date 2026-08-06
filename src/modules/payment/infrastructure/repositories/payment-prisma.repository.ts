import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { IPaymentRepository } from '@domain/repository-contracts/payment-repository.contract';
import { Payment } from '@domain/entities/orders/Payment';
import { PaymentId } from '@domain/value-objects/PaymentId';
import { OrderId } from '@domain/value-objects/OrderId';
import { PaymentIntentId } from '@domain/value-objects/PaymentIntentId';
import { Gateway } from '@domain/value-objects/Gateway';
import { Metadata } from '@domain/value-objects/Metadata';
import { Money } from '@domain/value-objects/Money';
import { Currency } from '@domain/value-objects/Currency';
import {
  PaymentMethod,
  PaymentStatus,
} from '@domain/entities/enums.enum';

export const PAYMENT_PRISMA_REPOSITORY = 'PAYMENT_PRISMA_REPOSITORY';

@Injectable()
export class PaymentPrismaRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Payment | null> {
    const record = await this.prisma.payment.findUnique({
      where: { id, deletedAt: null },
      include: { items: true },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async save(entity: Payment): Promise<Payment> {
    const userId =
      ((entity as unknown as Record<string, unknown>).userId as string | undefined) ?? '';

    const paymentData = {
      amount: entity.amount.amount,
      currency: entity.amount.currency.code,
      status: entity.status,
      method: entity.method,
      provider: (entity.gateway.name as string) || null,
      providerRef: entity.paymentIntentId.value || null,
      metadata: entity.metadata.value,
      paidAt: entity.paidAt ?? null,
      refundedAt: entity.refundedAt ?? null,
      errorMessage: entity.errorMessage ?? null,
      refundReason: entity.refundReason ?? null,
    };

    const existing = await this.prisma.payment.findUnique({
      where: { id: entity.id.value },
      include: { items: true },
    });

    if (existing) {
      const updated = await this.prisma.payment.update({
        where: { id: entity.id.value },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: paymentData as any,
        include: { items: true },
      });

      return this.mapToDomain(updated);
    }

    const created = await this.prisma.payment.create({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: {
        id: entity.id.value,
        userId,
        ...paymentData,
        items: {
          create: {
            orderId: entity.orderId.value,
            amount: entity.amount.amount,
          },
        },
      } as any,
      include: { items: true },
    });

    return this.mapToDomain(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.payment.softDelete({ id });
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const record = await this.prisma.payment.findFirst({
      where: {
        items: { some: { orderId } },
        deletedAt: null,
      },
      include: { items: true },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async findMany(options?: {
    orderId?: string;
    status?: PaymentStatus;
    gateway?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Payment[]> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (options?.orderId) {
      where.items = { some: { orderId: options.orderId } };
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.gateway) {
      where.provider = options.gateway as any;
    }

    if (options?.fromDate || options?.toDate) {
      where.createdAt = {
        ...(options.fromDate && { gte: options.fromDate }),
        ...(options.toDate && { lte: options.toDate }),
      };
    }

    const records = await this.prisma.payment.findMany({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: where as any,
      include: { items: true },
      take: options?.limit,
      skip: options?.offset,
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async count(options?: {
    orderId?: string;
    status?: PaymentStatus;
    gateway?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<number> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (options?.orderId) {
      where.items = { some: { orderId: options.orderId } };
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.gateway) {
      where.provider = options.gateway as any;
    }

    if (options?.fromDate || options?.toDate) {
      where.createdAt = {
        ...(options.fromDate && { gte: options.fromDate }),
        ...(options.toDate && { lte: options.toDate }),
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return this.prisma.payment.count({ where: where as any });
  }

  async findByStatus(status: PaymentStatus): Promise<Payment[]> {
    const records = await this.prisma.payment.findMany({
      where: { status, deletedAt: null },
      include: { items: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByGateway(gateway: string): Promise<Payment[]> {
    const records = await this.prisma.payment.findMany({
      where: { provider: gateway as any, deletedAt: null },
      include: { items: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async existsByOrderId(orderId: string): Promise<boolean> {
    const count = await this.prisma.payment.count({
      where: {
        items: { some: { orderId } },
        deletedAt: null,
      },
    });

    return count > 0;
  }

  async deleteByOrderId(orderId: string): Promise<void> {
    const payments = await this.prisma.payment.findMany({
      where: {
        items: { some: { orderId } },
        deletedAt: null,
      },
      select: { id: true },
    });

    for (const p of payments) {
      await this.prisma.payment.softDelete({ id: p.id });
    }
  }

  private mapToDomain(
    record: Record<string, unknown>,
  ): Payment {
    const items = (record.items as Array<{ orderId: string }> | undefined) ?? [];
    const orderId = items[0]?.orderId ?? '';

    return Payment.reconstitute({
      id: PaymentId.create(record.id as string),
      orderId: OrderId.create(orderId),
      amount: Money.fromDecimal(
        Number(record.amount),
        Currency.fromCode((record.currency as string) ?? 'VND'),
      ),
      method: record.method as PaymentMethod,
      status: record.status as PaymentStatus,
      paymentIntentId: PaymentIntentId.create(
        (record.providerRef as string) ?? '',
      ),
      gateway: Gateway.create((record.provider as string) ?? ''),
      metadata: Metadata.create(
        (record.metadata as Record<string, unknown>) ?? {},
      ),
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
      paidAt: (record.paidAt as Date) ?? undefined,
      refundedAt: (record.refundedAt as Date) ?? undefined,
      errorMessage: (record.errorMessage as string) ?? undefined,
      refundReason: (record.refundReason as string) ?? undefined,
    });
  }
}
