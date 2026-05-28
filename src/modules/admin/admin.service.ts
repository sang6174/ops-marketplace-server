// src/module/admin/admin.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import { toPrismaPage } from '@common/utils';
import {
  AccountStatus,
  LedgerAccountType,
  PaymentStatus,
  ProductStatus,
  UserRole,
} from '@infrastructure/generated/prisma/enums';
import {
  AssignCategoryAttributesDto,
  CreateAdminCategoryDto,
  FeatureProductDto,
  QueryAdminLedgerEntriesDto,
  QueryAdminOrdersDto,
  QueryAdminPayoutsDto,
  QueryAdminProductsDto,
  QueryAdminShopsDto,
  QueryAdminUsersDto,
  ReorderCategoriesDto,
  UpdateAdminCategoryDto,
  UpdateUserRolesDto,
  UpdateUserStatusDto,
} from './dtos/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(dto: QueryAdminUsersDto) {
    const { page = 1, limit = 20, status, search } = dto;
    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        ...toPrismaPage(page, limit),
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
          deletedAt: true,
          roles: { select: { role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(
      items.map((user) => ({
        ...user,
        roles: user.roles.map((r) => r.role),
      })),
      total,
      page,
      limit,
    );
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { select: { role: true } },
        shop: { select: { id: true, name: true, deletedAt: true } },
        addresses: true,
        bankAccounts: true,
      },
    });

    if (!user) throw new ResourceNotFoundException('User', userId);

    return {
      ...user,
      password: undefined,
      roles: user.roles.map((r) => r.role),
    };
  }

  async updateUserStatus(
    adminId: string,
    userId: string,
    dto: UpdateUserStatusDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ResourceNotFoundException('User', userId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { status: dto.status as AccountStatus },
      });

      if (dto.status === AccountStatus.SUSPENDED) {
        await tx.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      await tx.auditLog.create({
        data: {
          entity: 'User',
          entityId: userId,
          action: `Update status to ${dto.status}`,
          actorId: adminId,
          actorType: 'ADMIN',
          before: user,
          after: updated,
          metadata: dto.reason ? { reason: dto.reason } : undefined,
        },
      });

      return updated;
    });
  }

  async updateUserRoles(
    adminId: string,
    userId: string,
    dto: UpdateUserRolesDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ResourceNotFoundException('User', userId);

    const uniqueRoles = Array.from(new Set(dto.roles));
    if (uniqueRoles.length === 0) {
      throw new BadRequestException('User must have at least one role');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.userRoleMapping.deleteMany({ where: { userId } });
      await tx.userRoleMapping.createMany({
        data: uniqueRoles.map((role) => ({ userId, role })),
      });
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      const updatedRoles = await tx.userRoleMapping.findMany({
        where: { userId },
        select: { role: true },
      });

      await tx.auditLog.create({
        data: {
          entity: 'User',
          entityId: userId,
          action: 'Update roles',
          actorId: adminId,
          actorType: 'ADMIN',
          metadata: { roles: uniqueRoles },
        },
      });

      return {
        userId,
        roles: updatedRoles.map((r) => r.role),
      };
    });
  }

  async listShops(dto: QueryAdminShopsDto) {
    const { page = 1, limit = 20, search } = dto;
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          {
            owner: {
              OR: [
                { email: { contains: search, mode: 'insensitive' as const } },
                { name: { contains: search, mode: 'insensitive' as const } },
              ],
            },
          },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: {
          owner: {
            select: { id: true, email: true, name: true, status: true },
          },
          _count: { select: { products: true, orderItems: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async verifyShop(adminId: string, shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new ResourceNotFoundException('Shop', shopId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shop.update({
        where: { id: shopId },
        data: { deletedAt: null },
      });

      await tx.auditLog.create({
        data: {
          entity: 'Shop',
          entityId: shopId,
          action: 'Verify',
          actorId: adminId,
          actorType: 'ADMIN',
          before: shop,
          after: updated,
        },
      });

      return updated;
    });
  }

  async suspendShop(adminId: string, shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new ResourceNotFoundException('Shop', shopId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shop.update({
        where: { id: shopId },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          entity: 'Shop',
          entityId: shopId,
          action: 'Suspend',
          actorId: adminId,
          actorType: 'ADMIN',
          before: shop,
          after: updated,
        },
      });

      return updated;
    });
  }

  async createCategory(dto: CreateAdminCategoryDto) {
    const { path, level } = await this.resolveCategoryPath(
      dto.parentId,
      dto.slug,
    );

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        parentId: dto.parentId,
        path,
        level,
      },
    });
  }

  async updateCategory(categoryId: string, dto: UpdateAdminCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new ResourceNotFoundException('Category', categoryId);

    const slug = dto.slug ?? category.slug;
    const { path, level } = await this.resolveCategoryPath(
      category.parentId ?? undefined,
      slug,
    );

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name,
        slug,
        path,
        level,
      },
    });
  }

  async deleteCategory(categoryId: string) {
    const [children, used] = await this.prisma.$transaction([
      this.prisma.category.count({ where: { parentId: categoryId } }),
      this.prisma.productCategory.count({ where: { categoryId } }),
    ]);

    if (children > 0) {
      throw new BadRequestException('Cannot delete category with children');
    }
    if (used > 0) {
      throw new BadRequestException('Cannot delete category in use');
    }

    await this.prisma.category.delete({ where: { id: categoryId } });
    return { message: 'Category deleted' };
  }

  async reorderCategories(dto: ReorderCategoriesDto) {
    const categories = await this.prisma.category.findMany({
      where: {
        id: { in: dto.orderedIds },
        parentId: dto.parentId,
      },
    });

    if (categories.length !== dto.orderedIds.length) {
      throw new BadRequestException('Invalid category order payload');
    }

    return {
      message:
        'Schema does not have category sortOrder; order is validated but not persisted.',
      items: dto.orderedIds.map((id) =>
        categories.find((category) => category.id === id),
      ),
    };
  }

  async assignCategoryAttributes(
    categoryId: string,
    dto: AssignCategoryAttributesDto,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new ResourceNotFoundException('Category', categoryId);

    const attributeIds = dto.attributes.map((item) => item.attributeId);
    const attributes = await this.prisma.attribute.findMany({
      where: { id: { in: attributeIds } },
      select: { id: true },
    });
    if (attributes.length !== attributeIds.length) {
      throw new BadRequestException('One or more attributes are invalid');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.categoryAttribute.deleteMany({ where: { categoryId } });
      await tx.categoryAttribute.createMany({
        data: dto.attributes.map((item) => ({
          categoryId,
          attributeId: item.attributeId,
          type: item.type,
          isRequired: item.isRequired ?? false,
          isFilterable: item.isFilterable ?? true,
        })),
      });

      return tx.category.findUnique({
        where: { id: categoryId },
        include: { attribute: true },
      });
    });
  }

  async listOrders(dto: QueryAdminOrdersDto) {
    const { page = 1, limit = 20, status, paymentStatus } = dto;
    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: {
          user: { select: { id: true, email: true, name: true } },
          items: true,
          address: true,
          shipping: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async getOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        items: true,
        address: true,
        shipping: true,
        paymentItems: true,
      },
    });

    if (!order) throw new ResourceNotFoundException('Order', orderId);
    return order;
  }

  async listProducts(dto: QueryAdminProductsDto) {
    const { page = 1, limit = 20, status, search } = dto;
    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: {
          shop: { select: { id: true, name: true, ownerId: true } },
          stats: true,
          images: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async featureProduct(productId: string, dto: FeatureProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new ResourceNotFoundException('Product', productId);

    return this.prisma.product.update({
      where: { id: productId },
      data: { isFeatured: dto.isFeatured },
    });
  }

  async listLedgerAccounts() {
    return this.prisma.ledgerAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async listLedgerEntries(dto: QueryAdminLedgerEntriesDto) {
    const { page = 1, limit = 20, type, category, dateFrom, dateTo } = dto;
    const where = {
      ...(type && { type }),
      ...(category && { category }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async getLedgerBalance() {
    const accounts = await this.prisma.ledgerAccount.findMany();
    const byType = accounts.reduce<Record<string, string>>((acc, account) => {
      const current = Number(acc[account.type] ?? 0);
      acc[account.type] = (current + Number(account.balance)).toString();
      return acc;
    }, {});

    return {
      platformMain: byType[LedgerAccountType.PLATFORM_MAIN] ?? '0',
      platformFee: byType[LedgerAccountType.PLATFORM_FEE] ?? '0',
      sellerBalance: byType[LedgerAccountType.SELLER_BALANCE] ?? '0',
      sellerAvailable: byType[LedgerAccountType.SELLER_AVAILABLE] ?? '0',
      buyerWallet: byType[LedgerAccountType.BUYER_WALLET] ?? '0',
    };
  }

  async listPayouts(dto: QueryAdminPayoutsDto) {
    const { page = 1, limit = 20, status } = dto;
    const where = {
      ...(status && { status: status as any }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payout.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async processPayout(adminId: string, payoutId: string) {
    return this.updatePayout(adminId, payoutId, 'PAID');
  }

  async failPayout(adminId: string, payoutId: string) {
    return this.updatePayout(adminId, payoutId, 'FAILED');
  }

  async getReconciliation() {
    const [successfulPayments, paidPayouts, failedPayouts] =
      await this.prisma.$transaction([
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.SUCCESS, deletedAt: null },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.payout.aggregate({
          where: { status: 'PAID' },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.payout.count({ where: { status: 'FAILED' } }),
      ]);

    return {
      payments: {
        count: successfulPayments._count,
        amount: successfulPayments._sum.amount?.toString() ?? '0',
      },
      payouts: {
        paidCount: paidPayouts._count,
        paidAmount: paidPayouts._sum.amount?.toString() ?? '0',
        failedCount: failedPayouts,
      },
    };
  }

  private async resolveCategoryPath(
    parentId: string | undefined,
    slug: string,
  ) {
    if (!parentId) {
      return { path: `/${slug}`, level: 0 };
    }

    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
    });
    if (!parent) throw new ResourceNotFoundException('Parent category');

    return {
      path: `${parent.path}/${slug}`,
      level: parent.level + 1,
    };
  }

  private async updatePayout(
    adminId: string,
    payoutId: string,
    status: 'PAID' | 'FAILED',
  ) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new ResourceNotFoundException('Payout', payoutId);
    if (payout.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING payouts can be processed');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payout.update({
        where: { id: payoutId },
        data: {
          status,
          paidAt: status === 'PAID' ? new Date() : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          entity: 'Payout',
          entityId: payoutId,
          action: status === 'PAID' ? 'Process payout' : 'Fail payout',
          actorId: adminId,
          actorType: 'ADMIN',
          before: payout,
          after: updated,
        },
      });

      return updated;
    });
  }
}
