// src/modules/shop/shops.service.ts
import { Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { toPrismaPage } from '@common/utils';
import {
  ShopAlreadyExistsException,
  NotShopOwnerException,
  ResourceNotFoundException,
} from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import {
  CreateShopDto,
  UpdateShopDto,
  QueryShopsDto,
  QueryShopProductsDto,
} from './dtos/shop.dto';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateShopDto) {
    const existing = await this.prisma.shop.findUnique({
      where: { ownerId },
    });
    if (existing) throw new ShopAlreadyExistsException();

    return this.prisma.shop.create({
      data: { ownerId, name: dto.name, description: dto.description },
    });
  }

  async createMyShop(ownerId: string, dto: CreateShopDto) {
    return this.create(ownerId, dto);
  }

  async getMyShop(ownerId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId, deletedAt: null },
      include: { _count: { select: { products: true, orderItems: true } } },
    });
    if (!shop) throw new ResourceNotFoundException('Shop');
    return shop;
  }

  async update(ownerId: string, dto: UpdateShopDto) {
    await this.assertOwner(ownerId);
    return this.prisma.shop.update({
      where: { ownerId },
      data: dto,
    });
  }

  async updateMyShop(ownerId: string, dto: UpdateShopDto) {
    return this.update(ownerId, dto);
  }

  async findAll(dto: QueryShopsDto) {
    const { page = 1, limit = 20, search } = dto;
    const where = {
      deletedAt: null,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
    });
    if (!shop) throw new ResourceNotFoundException('Shop', shopId);
    return shop;
  }

  async findProducts(shopId: string, dto: QueryShopProductsDto) {
    await this.findOne(shopId);

    const { page = 1, limit = 20, search, status } = dto;
    const where = {
      shopId,
      deletedAt: null,
      status: status ?? ProductStatus.ACTIVE,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: {
          images: true,
          stats: true,
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async getMyStats(ownerId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId, deletedAt: null },
      select: { id: true },
    });

    if (!shop) throw new ResourceNotFoundException('Shop');

    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalProducts,
      activeProducts,
      paidRevenue,
    ] = await this.prisma.$transaction([
      this.prisma.order.count({
        where: { deletedAt: null, items: { some: { shopId: shop.id } } },
      }),
      this.prisma.order.count({
        where: {
          deletedAt: null,
          status: OrderStatus.PENDING,
          items: { some: { shopId: shop.id } },
        },
      }),
      this.prisma.order.count({
        where: {
          deletedAt: null,
          status: OrderStatus.DELIVERED,
          items: { some: { shopId: shop.id } },
        },
      }),
      this.prisma.order.count({
        where: {
          deletedAt: null,
          status: OrderStatus.CANCELLED,
          items: { some: { shopId: shop.id } },
        },
      }),
      this.prisma.product.count({
        where: { shopId: shop.id, deletedAt: null },
      }),
      this.prisma.product.count({
        where: {
          shopId: shop.id,
          deletedAt: null,
          status: ProductStatus.ACTIVE,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          deletedAt: null,
          paymentStatus: PaymentStatus.SUCCEEDED,
          items: { some: { shopId: shop.id } },
        },
        _sum: { totalPrice: true },
      }),
    ]);

    return {
      shopId: shop.id,
      revenue: paidRevenue._sum.totalPrice?.toString() ?? '0',
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
      },
    };
  }

  // ===== Internal Helpers =====
  async assertOwner(ownerId: string): Promise<void> {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId, deletedAt: null },
    });
    if (!shop) throw new NotShopOwnerException();
  }

  async getShopIdByOwner(ownerId: string): Promise<string> {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId, deletedAt: null },
      select: { id: true },
    });
    if (!shop) throw new ResourceNotFoundException('Shop');
    return shop.id;
  }
}
