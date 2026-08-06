import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { IBankAccountRepository } from '@domain/repository-contracts/bank-account-repository.contract';
import { BankAccount } from '@domain/entities/financial/BankAccount';
import { BankName } from '@domain/value-objects/BankName';
import { BankAccountNumber } from '@domain/value-objects/BankAccountNumber';
import { AccountHolderName } from '@domain/value-objects/BankAccountHolderName';

export const BANK_ACCOUNT_PRISMA_REPOSITORY = 'BANK_ACCOUNT_PRISMA_REPOSITORY';

@Injectable()
export class BankAccountPrismaRepository implements IBankAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BankAccount | null> {
    const record = await this.prisma.bankAccount.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async save(entity: BankAccount): Promise<BankAccount> {
    const existing = await this.prisma.bankAccount.findUnique({
      where: { id: entity.id },
    });

    if (existing) {
      const updated = await this.prisma.bankAccount.update({
        where: { id: entity.id },
        data: {
          bankName: entity.bankName.value,
          accountNo: entity.accountNo.value,
          accountName: entity.accountName.value,
          isDefault: entity.isDefault,
        },
      });

      return this.mapToDomain(updated);
    }

    const count = await this.prisma.bankAccount.count({
      where: { userId: entity.userId, deletedAt: null },
    });

    const created = await this.prisma.bankAccount.create({
      data: {
        id: entity.id,
        userId: entity.userId,
        bankName: entity.bankName.value,
        accountNo: entity.accountNo.value,
        accountName: entity.accountName.value,
        isDefault: count === 0 ? true : entity.isDefault,
      },
    });

    return this.mapToDomain(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.bankAccount.softDelete({ id });
  }

  async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<BankAccount[]> {
    const records = await this.prisma.bankAccount.findMany({
      where: { userId, deletedAt: null },
      take: options?.limit,
      skip: options?.offset,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findDefaultByUserId(userId: string): Promise<BankAccount | null> {
    const record = await this.prisma.bankAccount.findFirst({
      where: { userId, isDefault: true, deletedAt: null },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.bankAccount.count({
      where: { userId, deletedAt: null },
    });
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const count = await this.prisma.bankAccount.count({
      where: { userId, deletedAt: null },
    });
    return count > 0;
  }

  async deleteByUserId(userId: string): Promise<void> {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });

    if (accounts.length === 0) return;

    await this.prisma.bankAccount.updateMany({
      where: { id: { in: accounts.map((a) => a.id) } },
      data: { deletedAt: new Date() },
    });
  }

  async unsetAllDefaultByUserId(userId: string): Promise<void> {
    await this.prisma.bankAccount.updateMany({
      where: { userId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    });
  }

  private mapToDomain(record: Record<string, unknown>): BankAccount {
    return BankAccount.reconstitute({
      id: record['id'] as string,
      userId: record['userId'] as string,
      bankName: BankName.create(record['bankName'] as string),
      accountNo: BankAccountNumber.create(record['accountNo'] as string),
      accountName: AccountHolderName.create(record['accountName'] as string),
      isDefault: record['isDefault'] as boolean,
      createdAt: record['createdAt'] as Date,
    });
  }
}
