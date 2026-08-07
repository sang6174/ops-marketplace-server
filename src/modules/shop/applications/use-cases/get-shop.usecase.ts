import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { toPrismaPage } from '@common/utils';
import { ResourceNotFoundException } from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import {
  IGetShopByIdUseCase,
  IGetShopsByOwnerUseCase,
  IGetShopsUseCase,
} from '../contracts/IGetShopUsecase';
import {
  ShopResponse,
  GetShopsByOwnerInput,
  GetShopsInput,
} from '../../interfaces/dtos/shop.dto';

@Injectable()
export class GetShopUseCase implements IGetShopByIdUseCase, IGetShopsByOwnerUseCase, IGetShopsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(shopId: string): Promise<ShopResponse>;
  async execute(input: GetShopsByOwnerInput): Promise<ShopResponse[]>;
  async execute(input: GetShopsInput): Promise<ShopResponse[]>;
  async execute(
    input: string | GetShopsByOwnerInput | GetShopsInput,
  ): Promise<ShopResponse | ShopResponse[]> {
    if (typeof input === 'string') {
      return this.getById(input);
    }

    if ('offset' in input || 'includeDeleted' in input) {
      return this.getByOwner(input as GetShopsByOwnerInput);
    }

    return this.getAll(input as GetShopsInput);
  }

  private async getById(shopId: string): Promise<ShopResponse> {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
    });

    if (!shop) throw new ResourceNotFoundException('Shop', shopId);
    return shop as unknown as ShopResponse;
  }

  private async getByOwner(input: GetShopsByOwnerInput): Promise<ShopResponse[]> {
    const where: Record<string, unknown> = { ownerId: input.ownerId };

    if (!input.includeDeleted) {
      where.deletedAt = null;
    }

    const shops = await this.prisma.shop.findMany({
      where,
      take: input.limit,
      skip: input.offset,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { products: true } },
      },
    });

    return shops as unknown as ShopResponse[];
  }

  private async getAll(input: GetShopsInput): Promise<ShopResponse[]> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(input.status && { status: input.status }),
      ...(input.ownerId && { ownerId: input.ownerId }),
      ...(input.search && {
        name: { contains: input.search, mode: 'insensitive' },
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

    return paginate(items, total, page, limit) as unknown as ShopResponse[];
  }
}
