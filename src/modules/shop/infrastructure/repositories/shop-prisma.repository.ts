import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { IShopRepository } from '@domain/repository-contracts/shop-repository.contract';
import { Shop } from '@domain/entities/products/Shop';
import { ShopId } from '@domain/value-objects/ShopId';
import { UserId } from '@domain/value-objects/UserId';
import { ShopName } from '@domain/value-objects/ShopName';
import { ShopDescription } from '@domain/value-objects/ShopDescription';

export const SHOP_PRISMA_REPOSITORY = 'SHOP_PRISMA_REPOSITORY';

@Injectable()
export class ShopPrismaRepository implements IShopRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Shop | null> {
    const record = await this.prisma.shop.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async save(entity: Shop): Promise<Shop> {
    const existing = await this.prisma.shop.findUnique({
      where: { id: entity.id.value },
    });

    const data = {
      ownerId: entity.ownerId.value,
      name: entity.name.value,
      description: entity.description.value,
    };

    if (existing) {
      const updated = await this.prisma.shop.update({
        where: { id: entity.id.value },
        data,
      });

      return this.mapToDomain(updated);
    }

    const created = await this.prisma.shop.create({
      data: {
        id: entity.id.value,
        ...data,
      },
    });

    return this.mapToDomain(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.shop.softDelete({ id });
  }

  async findByOwnerId(
    ownerId: string,
    options?: {
      includeDeleted?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<Shop[]> {
    const where: Record<string, unknown> = { ownerId };

    if (!options?.includeDeleted) {
      where.deletedAt = null;
    }

    const records = await this.prisma.shop.findMany({
      where,
      take: options?.limit,
      skip: options?.offset,
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async countByOwnerId(ownerId: string): Promise<number> {
    return this.prisma.shop.count({
      where: { ownerId, deletedAt: null },
    });
  }

  async searchByName(searchTerm: string): Promise<Shop[]> {
    const records = await this.prisma.shop.findMany({
      where: {
        deletedAt: null,
        name: { contains: searchTerm, mode: 'insensitive' },
      },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByIds(ids: string[]): Promise<Shop[]> {
    const records = await this.prisma.shop.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async existsByNameAndOwner(
    name: string,
    ownerId: string,
  ): Promise<boolean> {
    return this.prisma.shop.exists({
      name,
      ownerId,
      deletedAt: null,
    });
  }

  async restore(id: string): Promise<void> {
    await this.prisma.shop.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  private mapToDomain(record: Record<string, unknown>): Shop {
    return Shop.reconstitute({
      id: ShopId.create(record.id as string),
      ownerId: UserId.create(record.ownerId as string),
      name: ShopName.create(record.name as string),
      description: ShopDescription.create(
        (record.description as string) ?? undefined,
      ),
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
      deletedAt: (record.deletedAt as Date) ?? null,
    });
  }
}
