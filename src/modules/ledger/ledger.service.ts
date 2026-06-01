import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@infrastructure/generated/prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { toPrismaPage } from '@common/utils';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  LedgerAccountType,
  LedgerEntryType,
} from '@infrastructure/generated/prisma/enums';
import {
  CreateLedgerAccountDto,
  RecordLedgerEntryDto,
  QueryLedgerEntriesDto,
  GetAccountBalanceDto,
} from './dtos/ledger.dto';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async createAccount(ownerId: string | null, dto: CreateLedgerAccountDto) {
    const existing = await this.prisma.ledgerAccount.findUnique({
      where: {
        ownerId_type: {
          ownerId: ownerId ?? '',
          type: dto.type,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Account of type ${dto.type} already exists for owner ${ownerId || 'platform'}`,
      );
    }

    return this.prisma.ledgerAccount.create({
      data: {
        ownerId,
        type: dto.type,
        balance: 0,
      },
    });
  }

  async getAccount(accountId: string) {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new ResourceNotFoundException('Ledger Account', accountId);
    }

    return account;
  }

  async getAccountByTypAndOwner(
    ownerId: string | null,
    type: LedgerAccountType,
  ) {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: {
        ownerId_type: {
          ownerId: ownerId ?? '',
          type,
        },
      },
    });

    if (!account) {
      throw new ResourceNotFoundException(
        `Ledger Account of type ${type} for owner ${ownerId || 'platform'}`,
      );
    }

    return account;
  }

  async recordEntry(dto: RecordLedgerEntryDto) {
    const account = await this.getAccount(dto.accountId);

    if (!account) {
      throw new ResourceNotFoundException('Ledger Account', dto.accountId);
    }

    const amount =
      dto.type === LedgerEntryType.DEBIT
        ? -Number(dto.amount)
        : Number(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      const entry = await this.createLedgerEntryIfMissing(tx, {
        accountId: dto.accountId,
        amount: dto.amount,
        type: dto.type,
        reference: dto.reference,
        transactionId: dto.transactionId,
        category: dto.category,
      });

      if (!entry) {
        const current = await tx.ledgerAccount.findUnique({
          where: { id: dto.accountId },
        });
        return {
          entry: await tx.ledgerEntry.findFirst({
            where: {
              accountId: dto.accountId,
              transactionId: dto.transactionId,
              category: dto.category,
            },
          }),
          account: current,
        };
      }

      const updated = await tx.ledgerAccount.update({
        where: { id: dto.accountId },
        data: { balance: { increment: amount } },
      });

      return {
        entry,
        account: updated,
      };
    });
  }

  async getBalance(accountId: string): Promise<GetAccountBalanceDto> {
    const account = await this.getAccount(accountId);

    return {
      accountId,
      balance: account.balance.toString(),
    };
  }

  async listEntries(dto: QueryLedgerEntriesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const where: Record<string, unknown> = {};
    if (dto.accountId) where.accountId = dto.accountId;
    if (dto.category) where.category = dto.category;
    if (dto.reference) where.reference = dto.reference;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toPrismaPage(page, limit),
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async getEntriesByAccount(accountId: string, dto: QueryLedgerEntriesDto) {
    await this.getAccount(accountId);

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const where: Record<string, unknown> = {
      accountId,
    };
    if (dto.category) where.category = dto.category;
    if (dto.reference) where.reference = dto.reference;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toPrismaPage(page, limit),
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async reverseEntry(entryId: string, reason: string) {
    const entry = await this.prisma.ledgerEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new ResourceNotFoundException('Ledger Entry', entryId);
    }

    return this.prisma.$transaction(async (tx) => {
      const reverseType =
        entry.type === LedgerEntryType.DEBIT
          ? LedgerEntryType.CREDIT
          : LedgerEntryType.DEBIT;

      const reverseEntry = await this.createLedgerEntryIfMissing(tx, {
        accountId: entry.accountId,
        amount: entry.amount,
        type: reverseType,
        reference: `REVERSE:${entry.reference}`,
        transactionId: `REV-${entry.transactionId}`,
        category: entry.category,
      });

      const amount =
        entry.type === LedgerEntryType.DEBIT
          ? Number(entry.amount)
          : -Number(entry.amount);

      const updated = reverseEntry
        ? await tx.ledgerAccount.update({
            where: { id: entry.accountId },
            data: { balance: { increment: amount } },
          })
        : await tx.ledgerAccount.findUnique({
            where: { id: entry.accountId },
          });

      return {
        originalEntry: entry,
        reverseEntry:
          reverseEntry ??
          (await tx.ledgerEntry.findFirst({
            where: {
              accountId: entry.accountId,
              transactionId: `REV-${entry.transactionId}`,
              category: entry.category,
            },
          })),
        account: updated,
      };
    });
  }

  private async createLedgerEntryIfMissing(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    data: Prisma.LedgerEntryUncheckedCreateInput,
  ) {
    try {
      return await tx.ledgerEntry.create({ data });
    } catch (error) {
      if (this.isUniqueViolation(error)) return null;
      throw error;
    }
  }

  private isUniqueViolation(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
