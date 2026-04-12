// src/modules/inventory/inventories.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { toPrismaPage } from '@common/utils';
import { ResourceNotFoundException } from '@common/exceptions';
import { AdjustInventoryDto, QueryInventoryDto } from './dtos/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listInventory(dto: QueryInventoryDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const variantWhere: Record<string, unknown> = {};
    if (dto.productId) variantWhere.productId = dto.productId;
    if (dto.shopId) variantWhere.product = { shopId: dto.shopId };

    const where: Record<string, unknown> = {};
    if (dto.variantId) where.variantId = dto.variantId;
    if (Object.keys(variantWhere).length) where.variant = variantWhere;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        ...toPrismaPage(page, limit),
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async getInventory(variantId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!inventory) {
      throw new ResourceNotFoundException('Inventory', variantId);
    }

    return inventory;
  }

  async adjustInventory(variantId: string, dto: AdjustInventoryDto) {
    if (
      dto.stockDelta === undefined &&
      dto.reservedDelta === undefined &&
      dto.soldDelta === undefined
    ) {
      throw new BadRequestException(
        'At least one inventory delta must be provided',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const currentInventory = await tx.inventory.findUnique({
        where: { variantId },
      });

      if (!currentInventory) {
        throw new ResourceNotFoundException('Inventory', variantId);
      }

      const nextStock = currentInventory.stock + (dto.stockDelta ?? 0);
      const nextReserved = currentInventory.reserved + (dto.reservedDelta ?? 0);
      const nextSold = currentInventory.sold + (dto.soldDelta ?? 0);

      if (nextStock < 0 || nextReserved < 0 || nextSold < 0) {
        throw new BadRequestException('Inventory counts cannot be negative');
      }

      return tx.inventory.update({
        where: { variantId },
        data: {
          stock: nextStock,
          reserved: nextReserved,
          sold: nextSold,
        },
      });
    });
  }
}
