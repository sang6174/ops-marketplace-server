import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { IPayoutRepository } from '@domain/repository-contracts/payout-repository.contract';
import { Payout } from '@domain/entities/payouts/Payout';
import { PayoutId } from '@domain/value-objects/PayoutId';
import { UserId } from '@domain/value-objects/UserId';
import { Money } from '@domain/value-objects/Money';
import { Currency } from '@domain/value-objects/Currency';
import { PayoutMethod } from '@domain/value-objects/PayoutMethod';
import { PayoutReference } from '@domain/value-objects/PayoutReference';
import { PayoutState } from '@domain/value-objects/PayoutState';
import { PayoutStatusEnum } from '@domain/entities/enums.enum';

export const PAYOUT_PRISMA_REPOSITORY = 'PAYOUT_PRISMA_REPOSITORY';

@Injectable()
export class PayoutPrismaRepository implements IPayoutRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Payout | null> {
    const record = await this.prisma.payout.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async save(entity: Payout): Promise<Payout> {
    const payoutData = {
      amount: entity.amount.amount,
      status: entity.status.value,
      method: entity.method?.value ?? null,
      reference: entity.reference?.value ?? null,
      paidAt: entity.paidAt ?? null,
    };

    const existing = await this.prisma.payout.findUnique({
      where: { id: entity.id.value },
    });

    if (existing) {
      const updated = await this.prisma.payout.update({
        where: { id: entity.id.value },
        data: payoutData,
      });

      return this.mapToDomain(updated);
    }

    const created = await this.prisma.payout.create({
      data: {
        id: entity.id.value,
        userId: entity.userId.value,
        ...payoutData,
      },
    });

    return this.mapToDomain(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.payout.softDelete({ id });
  }

  async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number; status?: PayoutStatusEnum },
  ): Promise<Payout[]> {
    const records = await this.prisma.payout.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(options?.status && { status: options.status }),
      },
      take: options?.limit,
      skip: options?.offset,
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByStatus(status: PayoutStatusEnum): Promise<Payout[]> {
    const records = await this.prisma.payout.findMany({
      where: { status, deletedAt: null },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByDateRange(from: Date, to: Date): Promise<Payout[]> {
    const records = await this.prisma.payout.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async countByUserId(
    userId: string,
    status?: PayoutStatusEnum,
  ): Promise<number> {
    return this.prisma.payout.count({
      where: {
        userId,
        deletedAt: null,
        ...(status && { status }),
      },
    });
  }

  async existsByReference(reference: string): Promise<boolean> {
    const count = await this.prisma.payout.count({
      where: { reference, deletedAt: null },
    });

    return count > 0;
  }

  async findPendingOlderThan(date: Date): Promise<Payout[]> {
    const records = await this.prisma.payout.findMany({
      where: {
        status: PayoutStatusEnum.PENDING,
        deletedAt: null,
        createdAt: { lt: date },
      },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async deleteByUserId(userId: string): Promise<void> {
    const payouts = await this.prisma.payout.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });

    for (const p of payouts) {
      await this.prisma.payout.softDelete({ id: p.id });
    }
  }

  private mapToDomain(
    record: Record<string, unknown>,
  ): Payout {
    const statusMapping: Record<string, PayoutState> = {
      PENDING: PayoutState.pending(),
      PAID: PayoutState.paid(),
      FAILED: PayoutState.failed(),
    };

    const statusValue = record.status as string;
    const payoutState =
      statusMapping[statusValue] ?? PayoutState.pending();

    return Payout.reconstitute({
      id: PayoutId.create(record.id as string),
      userId: UserId.create(record.userId as string),
      amount: Money.fromDecimal(
        Number(record.amount),
        Currency.VND,
      ),
      method: record.method
        ? PayoutMethod.fromString(record.method as string)
        : null,
      reference: record.reference
        ? PayoutReference.create(record.reference as string)
        : null,
      status: payoutState,
      createdAt: record.createdAt as Date,
      paidAt: (record.paidAt as Date) ?? null,
    });
  }
}
