// src/modules/shop/shops.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { toPrismaPage } from '@common/utils';
import {
  ShopAlreadyExistsException,
  NotShopOwnerException,
  ResourceNotFoundException,
} from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import { CreateShopDto, UpdateShopDto, QueryShopsDto } from './dtos/shop.dto';

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

  async getMyShop(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
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

  // ===== Internal Helpers =====
  async assertOwner(ownerId: string): Promise<void> {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
    if (!shop) throw new NotShopOwnerException();
  }

  async getShopIdByOwner(ownerId: string): Promise<string> {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      select: { id: true },
    });
    if (!shop) throw new ResourceNotFoundException('Shop');
    return shop.id;
  }
}
