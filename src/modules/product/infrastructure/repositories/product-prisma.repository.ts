import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import {
  IProductRepository,
  ProductFilters,
} from '@domain/repository-contracts/product-repository.contract';
import { Product } from '@domain/entities/products/Product';
import { ProductId } from '@domain/value-objects/ProductId';
import { ProductName } from '@domain/value-objects/ProductName';
import { ProductDescription } from '@domain/value-objects/ProductDescription';
import { ProductOrigin } from '@domain/value-objects/ProductOrigin';
import { ProductPrice } from '@domain/value-objects/ProductPrice';
import { WholesaleInfo } from '@domain/value-objects/WholesaleInfo';
import { ProductSeason } from '@domain/value-objects/ProductSeason';
import { ProductCertification } from '@domain/value-objects/ProductCertification';
import { ProductCertifications } from '@domain/value-objects/ProductCertifications';
import {
  ProductCategory,
  ProductStatus,
} from '@domain/entities/enums.enum';

export const PRODUCT_PRISMA_REPOSITORY = 'PRODUCT_PRISMA_REPOSITORY';

@Injectable()
export class ProductPrismaRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: { certifications: true },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async save(entity: Product): Promise<Product> {
    const productData = {
      id: entity.id.value,
      shopId: entity.shopId,
      sellerId: entity.sellerId,
      name: entity.name.value,
      slug:
        entity.name.value
          .toLowerCase()
          .replace(/[^a-z0-9\u00C0-\u1EF9\s]/g, '')
          .trim()
          .replace(/\s+/g, '-') +
        '-' +
        entity.id.value.substring(0, 8),
      description: entity.description.value || null,
      category: entity.category,
      unit: entity.unit,
      status: entity.status,
      retailPrice: entity.retailPrice.amount,
      wholesalePrice: entity.wholesaleInfo?.wholesalePrice.amount ?? null,
      minWholesaleQty: entity.wholesaleInfo?.minQuantity ?? null,
      origin: entity.origin.value || null,
      isSeasonal: entity.season !== null,
      seasonStart: entity.season?.start ?? null,
      seasonEnd: entity.season?.end ?? null,
    };

    const certValues = entity.certifications.items.map((c) => c.value);

    const existing = await this.prisma.product.findUnique({
      where: { id: entity.id.value },
    });

    if (existing) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const record = await tx.product.update({
          where: { id: entity.id.value },
          data: productData,
        });

        await tx.productCertification.deleteMany({
          where: { productId: entity.id.value },
        });

        if (certValues.length > 0) {
          await tx.productCertification.createMany({
            data: certValues.map((cert) => ({
              productId: entity.id.value,
              certification: cert,
            })),
          });
        }

        return record;
      });

      return this.mapToDomain({ ...updated, certifications: certValues.map((c) => ({ certification: c })) });
    }

    const created = await this.prisma.product.create({
      data: {
        ...productData,
        certifications: {
          create: certValues.map((cert) => ({ certification: cert })),
        },
      },
      include: { certifications: true },
    });

    return this.mapToDomain(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.softDelete({ id });
  }

  async findBySellerId(
    sellerId: string,
    options?: {
      status?: ProductStatus;
      category?: ProductCategory;
      limit?: number;
      offset?: number;
    },
  ): Promise<Product[]> {
    const records = await this.prisma.product.findMany({
      where: {
        sellerId,
        deletedAt: null,
        ...(options?.status && { status: options.status }),
        ...(options?.category && { category: options.category }),
      },
      include: { certifications: true },
      take: options?.limit,
      skip: options?.offset,
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByCategory(category: ProductCategory): Promise<Product[]> {
    const records = await this.prisma.product.findMany({
      where: { category, deletedAt: null },
      include: { certifications: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByStatus(status: ProductStatus): Promise<Product[]> {
    const records = await this.prisma.product.findMany({
      where: { status, deletedAt: null },
      include: { certifications: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findInSeason(date?: Date): Promise<Product[]> {
    const target = date ?? new Date();

    const records = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        isSeasonal: true,
        seasonStart: { lte: target },
        seasonEnd: { gte: target },
      },
      include: { certifications: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async searchByNameOrDescription(query: string): Promise<Product[]> {
    const records = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { certifications: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findWithWholesale(): Promise<Product[]> {
    const records = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        wholesalePrice: { not: null },
        minWholesaleQty: { not: null },
      },
      include: { certifications: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findMany(filters: ProductFilters): Promise<Product[]> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.isSeasonal !== undefined) {
      where.isSeasonal = filters.isSeasonal;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.retailPrice = {
        ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
        ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
      };
    }

    if (filters.hasWholesale === true) {
      where.wholesalePrice = { not: null };
      where.minWholesaleQty = { not: null };
    } else if (filters.hasWholesale === false) {
      where.OR = [
        { wholesalePrice: null },
        { minWholesaleQty: null },
      ];
    }

    if (filters.origins?.length) {
      where.origin = { in: filters.origins };
    }

    if (filters.certifications?.length) {
      where.certifications = {
        some: { certification: { in: filters.certifications } },
      };
    }

    const records = await this.prisma.product.findMany({
      where,
      include: { certifications: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  private mapToDomain(
    record: Record<string, unknown>,
  ): Product {
    const hasWholesale =
      record.wholesalePrice != null && record.minWholesaleQty != null;
    const wholesaleInfo = hasWholesale
      ? WholesaleInfo.create(
          ProductPrice.fromNumber(Number(record.wholesalePrice)),
          record.minWholesaleQty as number,
        )
      : null;

    const hasSeason =
      record.isSeasonal === true &&
      record.seasonStart != null &&
      record.seasonEnd != null;
    const season = hasSeason
      ? ProductSeason.create(
          record.seasonStart as Date,
          record.seasonEnd as Date,
        )
      : null;

    const certs: ProductCertification[] = (
      (record.certifications as Array<{ certification: string }>) ?? []
    ).map((c) => ProductCertification.create(c.certification));

    return Product.reconstitute({
      id: ProductId.create(record.id as string),
      sellerId: record.sellerId as string,
      shopId: record.shopId as string,
      category: record.category as ProductCategory,
      unit: record.unit as string as any,
      name: ProductName.create(record.name as string),
      description: ProductDescription.create(
        (record.description as string) ?? '',
      ),
      retailPrice: ProductPrice.fromNumber(Number(record.retailPrice)),
      wholesaleInfo,
      origin: ProductOrigin.create((record.origin as string) ?? ''),
      season,
      certifications: ProductCertifications.create(certs),
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
      status: record.status as ProductStatus,
    });
  }
}
