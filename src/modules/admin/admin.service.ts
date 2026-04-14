// src/module/admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import { toPrismaPage } from '@common/utils';
import {
  QueryAdminUsersDto,
  UpdateUserStatusDto,
  QueryAuditLogsDto,
} from './dtos/admin.dto';
import { AccountStatus } from '@infrastructure/generated/prisma/enums';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // USERS MANAGEMENT
  async listUsers(dto: QueryAdminUsersDto) {
    const { page = 1, limit = 20, status, search } = dto;

    const where: any = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
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
          roles: {
            select: { role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const enriched = items.map((user) => ({
      ...user,
      roles: user.roles.map((r) => r.role),
    }));

    return paginate(enriched, total, page, limit);
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        roles: { select: { role: true } },
        shop: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    return {
      ...user,
      roles: user.roles.map((r) => r.role),
    };
  }

  async updateUserStatus(
    adminId: string,
    userId: string,
    dto: UpdateUserStatusDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { status: dto.status as AccountStatus },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          entity: 'User',
          entityId: userId,
          action: `Update status to ${dto.status}`,
          actorId: adminId,
          actorType: 'ADMIN',
          after: updated,
          metadata: dto.reason ? { reason: dto.reason } : undefined,
        },
      });

      return updated;
    });
  }

  async suspendUser(adminId: string, userId: string, reason?: string) {
    return this.updateUserStatus(adminId, userId, {
      status: 'SUSPENDED',
      reason,
    });
  }

  async activateUser(adminId: string, userId: string) {
    return this.updateUserStatus(adminId, userId, {
      status: 'ACTIVE',
    });
  }

  // SHOPS MANAGEMENT
  async listShops(adminId: string, page: number = 1, limit: number = 20) {
    const [shops, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        ...toPrismaPage(page, limit),
        include: {
          owner: { select: { id: true, email: true, name: true } },
          products: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count(),
    ]);

    const enriched = shops.map((shop) => ({
      ...shop,
      productCount: (shop.products as any).length,
      products: undefined,
    }));

    return paginate(enriched, total, page, limit);
  }

  async suspendShop(adminId: string, shopId: string, reason?: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId },
    });

    if (!shop) {
      throw new ResourceNotFoundException('Shop', shopId);
    }

    return this.prisma.$transaction(async (tx) => {
      // Suspend shop owner
      const updated = await tx.user.update({
        where: { id: shop.ownerId },
        data: { status: 'SUSPENDED' },
      });

      // Soft delete shop
      await tx.shop.update({
        where: { id: shopId },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          entity: 'Shop',
          entityId: shopId,
          action: 'Suspended',
          actorId: adminId,
          actorType: 'ADMIN',
          after: updated,
          metadata: reason ? { reason } : undefined,
        },
      });

      return updated;
    });
  }

  // AUDIT LOGS
  async listAuditLogs(adminId: string, dto: QueryAuditLogsDto) {
    const { page = 1, limit = 20, entity, action } = dto;

    const where: any = {
      ...(entity && { entity }),
      ...(action && { action: { contains: action, mode: 'insensitive' } }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }
}
