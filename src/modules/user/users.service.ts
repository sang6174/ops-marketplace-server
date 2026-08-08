import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserRole } from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  USER_PRISMA_REPOSITORY,
} from './infrastructure/repositories/user-prisma.repository';
import { IUserRepository } from '@domain/repository-contracts/user-repository.contract';
import { exclude } from '@common/utils';
import {
  ResourceNotFoundException,
  ResourceAlreadyExistsException,
} from '@common/exceptions';
import {
  CreateUserAddressDto,
  CreateUserBankAccountDto,
  UpdateProfileDto,
  UpdateUserAddressDto,
  UpdateUserBankAccountDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(USER_PRISMA_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        roles: { select: { role: true } },
        shop: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new ResourceNotFoundException('User', userId);

    return exclude(user, ['password']);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.ensureUserExists(userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email,
      },
    });
    return exclude(user, ['password']);
  }

  async deleteAccount(userId: string) {
    await this.ensureUserExists(userId);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'T├ái khoß║ún ─æ├ú ─æ╞░ß╗úc x├│a' };
  }

  async listActiveSessions(userId: string) {
    await this.ensureUserExists(userId);

    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
    });

    if (!session) {
      throw new ResourceNotFoundException('Session', sessionId);
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { message: 'Phi├¬n ─æ─âng nhß║¡p ─æ├ú ─æ╞░ß╗úc ─æ─âng xuß║Ñt' };
  }

  async becomeSeller(userId: string) {
    await this.ensureUserExists(userId);

    try {
      await this.prisma.userRoleMapping.create({
        data: { userId, role: UserRole.SELLER },
      });
    } catch {
      throw new ResourceAlreadyExistsException('Role SELLER', 'user n├áy ─æ├ú c├│');
    }

    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {
      message:
        'Bß║ín ─æ├ú c├│ quyß╗ün cß╗ºa ng╞░ß╗¥i b├ín. Vui l├▓ng ─æ─âng nhß║¡p lß║íi ─æß╗â cß║¡p nhß║¡t quyß╗ün v├á tß║ío cß╗¡a h├áng.',
    };
  }

  async listAddresses(userId: string) {
    await this.ensureUserExists(userId);

    return this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateUserAddressDto) {
    await this.ensureUserExists(userId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId, deletedAt: null },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          street: dto.street,
          city: dto.city,
          country: dto.country,
          isDefault: dto.isDefault ?? false,
        },
      });
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateUserAddressDto,
  ) {
    await this.getAddress(userId, addressId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: {
            userId,
            deletedAt: null,
            NOT: { id: addressId },
          },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id: addressId },
        data: {
          street: dto.street,
          city: dto.city,
          country: dto.country,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    await this.getAddress(userId, addressId);

    await this.prisma.address.update({
      where: { id: addressId },
      data: { deletedAt: new Date() },
    });

    return { message: '─Éß╗ïa chß╗ë ─æ├ú ─æ╞░ß╗úc x├│a' };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.getAddress(userId, addressId);

    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, deletedAt: null },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }

  async listBankAccounts(userId: string) {
    await this.ensureSeller(userId);

    return this.prisma.bankAccount.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createBankAccount(userId: string, dto: CreateUserBankAccountDto) {
    await this.ensureSeller(userId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.bankAccount.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.bankAccount.create({
        data: {
          userId,
          bankName: dto.bankName,
          accountNo: dto.accountNo,
          accountName: dto.accountName,
          isDefault: dto.isDefault ?? false,
        },
      });
    });
  }

  async updateBankAccount(
    userId: string,
    accountId: string,
    dto: UpdateUserBankAccountDto,
  ) {
    await this.getBankAccount(userId, accountId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.bankAccount.updateMany({
          where: { userId, isDefault: true, NOT: { id: accountId } },
          data: { isDefault: false },
        });
      }

      return tx.bankAccount.update({
        where: { id: accountId },
        data: {
          bankName: dto.bankName,
          accountNo: dto.accountNo,
          accountName: dto.accountName,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async deleteBankAccount(userId: string, accountId: string) {
    const account = await this.getBankAccount(userId, accountId);

    if (account.isDefault) {
      throw new BadRequestException(
        'Kh├┤ng thß╗â x├│a t├ái khoß║ún ng├ón h├áng mß║╖c ─æß╗ïnh',
      );
    }

    await this.prisma.bankAccount.delete({
      where: { id: accountId },
    });

    return { message: 'T├ái khoß║ún ng├ón h├áng ─æ├ú ─æ╞░ß╗úc x├│a' };
  }

  async setDefaultBankAccount(userId: string, accountId: string) {
    await this.getBankAccount(userId, accountId);

    return this.prisma.$transaction(async (tx) => {
      await tx.bankAccount.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.bankAccount.update({
        where: { id: accountId },
        data: { isDefault: true },
      });
    });
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    return user;
  }

  private async getAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId, deletedAt: null },
    });

    if (!address) {
      throw new ResourceNotFoundException('Address', addressId);
    }

    return address;
  }

  private async ensureSeller(userId: string) {
    await this.ensureUserExists(userId);

    const sellerRole = await this.prisma.userRoleMapping.findUnique({
      where: {
        userId_role: {
          userId,
          role: UserRole.SELLER,
        },
      },
    });

    if (!sellerRole) {
      throw new BadRequestException('Chß╗ë ng╞░ß╗¥i b├ín mß╗¢i c├│ t├ái khoß║ún ng├ón h├áng');
    }

    return sellerRole;
  }

  private async getBankAccount(userId: string, accountId: string) {
    await this.ensureSeller(userId);

    const account = await this.prisma.bankAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new ResourceNotFoundException('Bank account', accountId);
    }

    return account;
  }
}
