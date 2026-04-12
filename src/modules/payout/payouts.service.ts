// src/module/payout/payout.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import { toPrismaPage } from '@common/utils';
import {
  CreatePayoutDto,
  UpdatePayoutStatusDto,
  QueryPayoutsDto,
  BankAccountDto,
  PayoutStatusEnum,
} from './dtos/payout.dto';

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSellerBalance(sellerId: string) {
    // Get seller's available balance from ledger
    const availableAccount = await this.prisma.ledgerAccount.findFirst({
      where: {
        ownerId: sellerId,
        type: 'SELLER_AVAILABLE',
      },
    });

    // Get seller's total balance from ledger
    const totalAccount = await this.prisma.ledgerAccount.findFirst({
      where: {
        ownerId: sellerId,
        type: 'SELLER_BALANCE',
      },
    });

    const available = availableAccount?.balance?.toString() || '0';
    const total = totalAccount?.balance?.toString() || '0';

    // Calculate pending: total - available
    const availableNum = parseFloat(available);
    const totalNum = parseFloat(total);
    const pending = (totalNum - availableNum).toString();

    return {
      available,
      pending,
      total,
    };
  }

  async createPayout(sellerId: string, dto: CreatePayoutDto) {
    // Verify seller has a shop
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: sellerId },
    });

    if (!shop) {
      throw new BadRequestException('Only sellers can create payouts');
    }

    // Verify bank account exists and belongs to seller
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: {
        id: dto.bankAccountId,
        userId: sellerId,
      },
    });

    if (!bankAccount) {
      throw new ResourceNotFoundException('Bank account', dto.bankAccountId);
    }

    // Check available balance
    // Check available balance
    const balance = await this.getSellerBalance(sellerId);
    const amount = parseFloat(dto.amount);
    const available = parseFloat(balance.available);

    if (amount > available) {
      throw new BadRequestException('Insufficient balance for payout');
    }

    // Create payout in transaction
    return this.prisma.$transaction(async (tx) => {
      // Create payout record
      const payout = await tx.payout.create({
        data: {
          userId: sellerId,
          amount: dto.amount,
          status: 'PENDING',
          method: bankAccount.bankName,
          reference: bankAccount.accountNo,
        },
      });

      // Create ledger entry for debit from available balance
      const ledgerAccount = await tx.ledgerAccount.findFirst({
        where: {
          ownerId: sellerId,
          type: 'SELLER_AVAILABLE',
        },
      });

      if (ledgerAccount) {
        await tx.ledgerEntry.create({
          data: {
            accountId: ledgerAccount.id,
            amount: (-amount).toString(),
            type: 'DEBIT',
            reference: payout.id,
            transactionId: payout.id,
            category: 'PAYOUT',
          },
        });
      }

      return payout;
    });
  }

  async getPayout(payoutId: string, sellerId: string) {
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

  async listPayouts(sellerId: string, dto: QueryPayoutsDto) {
    const { page = 1, limit = 20, status } = dto;

    const where: any = {
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

  async updatePayoutStatus(
    payoutId: string,
    sellerId: string,
    dto: UpdatePayoutStatusDto,
  ) {
    const payout = await this.getPayout(payoutId, sellerId);

    // Validate status transitions
    if (payout.status !== 'PENDING') {
      throw new BadRequestException(
        'Can only update status of PENDING payouts',
      );
    }

    const updateData: any = {
      status: dto.status,
      reference: dto.reference || payout.reference,
    };

    if (dto.status === 'PAID') {
      updateData.paidAt = new Date();
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payout.update({
        where: { id: payoutId },
        data: updateData,
      });

      // If failed, reverse the ledger entry by crediting back to available
      if (dto.status === 'FAILED') {
        const availableAccount = await tx.ledgerAccount.findFirst({
          where: {
            ownerId: sellerId,
            type: 'SELLER_AVAILABLE',
          },
        });

        if (availableAccount) {
          await tx.ledgerEntry.create({
            data: {
              accountId: availableAccount.id,
              amount: (payout.amount as any).toString(),
              type: 'CREDIT',
              reference: payoutId,
              transactionId: payoutId,
              category: 'PAYOUT',
            },
          });
        }
      }

      return updated;
    });
  }

  // Bank Account Management
  async createBankAccount(sellerId: string, dto: BankAccountDto) {
    // Unset other defaults if this is default
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
    return this.prisma.bankAccount.findMany({
      where: { userId: sellerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async setDefaultBankAccount(accountId: string, sellerId: string) {
    await this.getBankAccount(accountId, sellerId);

    return this.prisma.$transaction(async (tx) => {
      // Unset other defaults
      await tx.bankAccount.updateMany({
        where: {
          userId: sellerId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });

      // Set this as default
      return tx.bankAccount.update({
        where: { id: accountId },
        data: { isDefault: true },
      });
    });
  }

  async deleteBankAccount(accountId: string, sellerId: string) {
    const account = await this.getBankAccount(accountId, sellerId);

    // Cannot delete default account
    if (account.isDefault) {
      throw new BadRequestException(
        'Cannot delete default bank account. Set another as default first.',
      );
    }

    return this.prisma.bankAccount.delete({
      where: { id: accountId },
    });
  }
}
