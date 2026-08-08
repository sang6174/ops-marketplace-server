// src/modules/shop/shops.service.ts
import { Inject, Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  SHOP_PRISMA_REPOSITORY,
} from './infrastructure/repositories/shop-prisma.repository';
import { IShopRepository } from '@domain/repository-contracts/shop-repository.contract';
import { toPrismaPage } from '@common/utils';
import {
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
import { CreateShopUseCase } from './applications/use-cases/create-shop.usecase';
import { GetShopUseCase } from './applications/use-cases/get-shop.usecase';
import { UpdateShopUseCase } from './applications/use-cases/update-shop.usecase';

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SHOP_PRISMA_REPOSITORY)
    private readonly shopRepo: IShopRepository,
    private readonly createShopUseCase: CreateShopUseCase,
    private readonly getShopUseCase: GetShopUseCase,
    private readonly updateShopUseCase: UpdateShopUseCase,
  ) {}

  async create(ownerId: string, dto: CreateShopDto) {
    return this.createShopUseCase.execute({ ...dto, ownerId } as any);
  }

  async createMyShop(ownerId: string, dto: CreateShopDto) {
    return this.create(ownerId, dto);
  }

  async getMyShop(ownerId: string) {
    const shops = await this.getShopUseCase.execute({
      ownerId,
      includeDeleted: false,
      limit: 1,
      offset: 0,
    });
    if (!shops.length) throw new ResourceNotFoundException('Shop');
    return shops[0];
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
    return this.getShopUseCase.execute({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
    });
  }

  async findOne(shopId: string) {
    return this.getShopUseCase.execute(shopId);
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
