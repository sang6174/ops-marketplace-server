import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { IInventoryRepository } from '@domain/repository-contracts/inventory-repository.contract';
import { Inventory } from '@domain/entities/products/Inventory';
import { InventoryId } from '@domain/value-objects/InventoryId';
import { ProductId } from '@domain/value-objects/ProductId';
import { Quantity } from '@domain/value-objects/Quantity';
import { MinStockThreshold } from '@domain/value-objects/MinStockThreshold';

interface InventoryRecord {
  productId: string;
  stock: number;
  reserved: number;
  minStockThreshold: number;
  lastRestockedAt: Date;
  updatedAt: Date;
}

export const INVENTORY_PRISMA_REPOSITORY = 'INVENTORY_PRISMA_REPOSITORY';

@Injectable()
export class InventoryPrismaRepository implements IInventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Inventory | null> {
    const record = await this.prisma.inventory.findUnique({
      where: { productId: id },
    });

    if (!record) return null;

    return this.mapToDomain(record as unknown as InventoryRecord);
  }

  async save(entity: Inventory): Promise<Inventory> {
    const existing = await this.prisma.inventory.findUnique({
      where: { productId: entity.id.value },
    });

    const data = {
      stock: entity.quantity.value,
      reserved: entity.reserved.value,
      minStockThreshold: entity.minStockThreshold.value,
      lastRestockedAt: entity.lastRestockedAt,
    };

    if (existing) {
      const updated = await this.prisma.inventory.update({
        where: { productId: entity.id.value },
        data,
      });
      return this.mapToDomain(updated as unknown as InventoryRecord);
    }

    const created = await this.prisma.inventory.create({
      data: {
        productId: entity.id.value,
        ...data,
      },
    });

    return this.mapToDomain(created as unknown as InventoryRecord);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.inventory.softDelete({ productId: id });
  }

  async findByProductId(productId: string): Promise<Inventory | null> {
    const record = await this.prisma.inventory.findUnique({
      where: { productId },
    });

    if (!record) return null;

    return this.mapToDomain(record as unknown as InventoryRecord);
  }

  async findLowStock(thresholdPercent?: number): Promise<Inventory[]> {
    if (thresholdPercent !== undefined) {
      const factor = thresholdPercent;
      const records = await this.prisma.$queryRawUnsafe<InventoryRecord[]>(
        `SELECT * FROM inventories WHERE stock <= (min_stock_threshold * $1)`,
        factor,
      );
      return records.map((r) => this.mapToDomain(r));
    }

    const records = await this.prisma.$queryRawUnsafe<InventoryRecord[]>(
      `SELECT * FROM inventories WHERE stock <= min_stock_threshold`,
    );
    return records.map((r) => this.mapToDomain(r));
  }

  private mapToDomain(record: InventoryRecord): Inventory {
    return Inventory.reconstitute({
      id: InventoryId.create(record.productId),
      productId: ProductId.create(record.productId),
      quantity: Quantity.fromNumber(record.stock),
      reserved: Quantity.fromNumber(record.reserved),
      minThreshold: MinStockThreshold.fromNumber(record.minStockThreshold),
      lastRestockedAt: record.lastRestockedAt,
      updatedAt: record.updatedAt,
    });
  }
}
