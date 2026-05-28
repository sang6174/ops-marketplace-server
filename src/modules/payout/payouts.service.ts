// src/module/payout/payout.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  LedgerAccountType,
  LedgerEntryCategory,
  LedgerEntryType,
  PayoutStatus,
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import { toPrismaPage } from '@common/utils';
import {
  BankAccountDto,
  CreatePayoutDto,
  QueryPayoutsDto,
  UpdatePayoutStatusDto,
} from './dtos/payout.dto';

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSellerBalance(sellerId: string) {
    await this.assertSellerShop(sellerId);

    const [availableAccount, totalAccount] = await Promise.all([
      this.getLedgerAccount(sellerId, LedgerAccountType.SELLER_AVAILABLE),
      this.getLedgerAccount(sellerId, LedgerAccountType.SELLER_BALANCE),
    ]);

    const available = Number(availableAccount?.balance ?? 0);
    const total = Number(totalAccount?.balance ?? 0);
    const pending = Math.max(total - available, 0);

    return {
      available: available.toString(),
      pending: pending.toString(),
      total: total.toString(),
      accounts: {
        availableAccountId: availableAccount?.id,
        totalAccountId: totalAccount?.id,
      },
    };
  }

  async getSellerBalanceHistory(sellerId: string, dto: QueryPayoutsDto) {
    await this.assertSellerShop(sellerId);

    const { page = 1, limit = 20 } = dto;
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: {
        ownerId: sellerId,
        type: {
          in: [
            LedgerAccountType.SELLER_AVAILABLE,
            LedgerAccountType.SELLER_BALANCE,
          ],
        },
      },
      select: { id: true, type: true },
    });

    const accountIds = accounts.map((account) => account.id);
    if (!accountIds.length) {
      return paginate([], 0, page, limit);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where: { accountId: { in: accountIds } },
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ledgerEntry.count({
        where: { accountId: { in: accountIds } },
      }),
    ]);

    const accountTypeById = new Map(
      accounts.map((account) => [account.id, account.type]),
    );

    return paginate(
      items.map((item) => ({
        ...item,
        accountType: accountTypeById.get(item.accountId),
      })),
      total,
      page,
      limit,
    );
  }

  async createPayout(sellerId: string, dto: CreatePayoutDto) {
    await this.assertSellerShop(sellerId);

    const bankAccount = dto.bankAccountId
      ? await this.getBankAccount(dto.bankAccountId, sellerId)
      : await this.getDefaultBankAccount(sellerId);

    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Payout amount must be greater than zero');
    }

    const availableAccount = await this.getLedgerAccount(
      sellerId,
      LedgerAccountType.SELLER_AVAILABLE,
    );
    if (!availableAccount) {
      throw new BadRequestException('Seller available balance is not ready');
    }

    if (amount > Number(availableAccount.balance)) {
      throw new BadRequestException('Insufficient balance for payout');
    }

    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          userId: sellerId,
          amount: dto.amount,
          status: PayoutStatus.PENDING,
          method: bankAccount.bankName,
          reference: bankAccount.accountNo,
        },
      });

      const updatedAccount = await tx.ledgerAccount.update({
        where: { id: availableAccount.id },
        data: { balance: { decrement: amount } },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: availableAccount.id,
          amount: dto.amount,
          type: LedgerEntryType.DEBIT,
          reference: payout.id,
          transactionId: payout.id,
          category: LedgerEntryCategory.PAYOUT,
        },
      });

      return {
        ...payout,
        balanceAfterRequest: updatedAccount.balance.toString(),
      };
    });
  }

  async listPayouts(sellerId: string, dto: QueryPayoutsDto) {
    await this.assertSellerShop(sellerId);

    const { page = 1, limit = 20, status } = dto;
    const where = {
      userId: sellerId,
      ...(status && { status }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payout.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async getPayout(payoutId: string, sellerId: string) {
    await this.assertSellerShop(sellerId);

    const payout = await this.prisma.payout.findFirst({
      where: {
        id: payoutId,
        userId: sellerId,
      },
    });

    if (!payout) {
      throw new ResourceNotFoundException('Payout', payoutId);
    }

    return payout;
  }

  async updatePayoutStatus(
    payoutId: string,
    sellerId: string,
    dto: UpdatePayoutStatusDto,
  ) {
    const payout = await this.getPayout(payoutId, sellerId);

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(
        'Can only update status of PENDING payouts',
      );
    }

    const updateData = {
      status: dto.status,
      reference: dto.reference || payout.reference,
      ...(dto.status === PayoutStatus.PAID && { paidAt: new Date() }),
    };

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payout.update({
        where: { id: payoutId },
        data: updateData,
      });

      if (dto.status === PayoutStatus.FAILED) {
        const availableAccount = await this.getLedgerAccount(
          sellerId,
          LedgerAccountType.SELLER_AVAILABLE,
        );

        if (availableAccount) {
          await tx.ledgerAccount.update({
            where: { id: availableAccount.id },
            data: { balance: { increment: payout.amount } },
          });

          await tx.ledgerEntry.create({
            data: {
              accountId: availableAccount.id,
              amount: payout.amount,
              type: LedgerEntryType.CREDIT,
              reference: payoutId,
              transactionId: payoutId,
              category: LedgerEntryCategory.PAYOUT,
            },
          });
        }
      }

      return updated;
    });
  }

  async createBankAccount(sellerId: string, dto: BankAccountDto) {
    await this.assertSellerShop(sellerId);

    if (dto.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: {
          userId: sellerId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.bankAccount.create({
      data: {
        userId: sellerId,
        bankName: dto.bankName,
        accountNo: dto.accountNo,
        accountName: dto.accountName,
        isDefault: dto.isDefault || false,
      },
    });
  }

  async getBankAccount(accountId: string, sellerId: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: {
        id: accountId,
        userId: sellerId,
      },
    });

    if (!account) {
      throw new ResourceNotFoundException('Bank account', accountId);
    }

    return account;
  }

  async listBankAccounts(sellerId: string) {
    await this.assertSellerShop(sellerId);

    return this.prisma.bankAccount.findMany({
      where: { userId: sellerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async setDefaultBankAccount(accountId: string, sellerId: string) {
    await this.assertSellerShop(sellerId);
    await this.getBankAccount(accountId, sellerId);

    return this.prisma.$transaction(async (tx) => {
      await tx.bankAccount.updateMany({
        where: {
          userId: sellerId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });

      return tx.bankAccount.update({
        where: { id: accountId },
        data: { isDefault: true },
      });
    });
  }

  async deleteBankAccount(accountId: string, sellerId: string) {
    await this.assertSellerShop(sellerId);
    const account = await this.getBankAccount(accountId, sellerId);

    if (account.isDefault) {
      throw new BadRequestException(
        'Cannot delete default bank account. Set another as default first.',
      );
    }

    return this.prisma.bankAccount.delete({
      where: { id: accountId },
    });
  }

  private async assertSellerShop(sellerId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: sellerId, deletedAt: null },
      select: { id: true },
    });

    if (!shop) {
      throw new BadRequestException('Only sellers can access payout APIs');
    }

    return shop;
  }

  private async getLedgerAccount(sellerId: string, type: LedgerAccountType) {
    return this.prisma.ledgerAccount.findUnique({
      where: {
        ownerId_type: {
          ownerId: sellerId,
          type,
        },
      },
    });
  }

  private async getDefaultBankAccount(sellerId: string) {
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { userId: sellerId, isDefault: true },
    });

    if (!bankAccount) {
      throw new BadRequestException(
        'Default bank account is required for payout request',
      );
    }

    return bankAccount;
  }
}
