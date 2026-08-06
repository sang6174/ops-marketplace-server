import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { ICategoryRepository } from '@domain/repository-contracts/category-repository.contract';
import { Category } from '@domain/entities/products/Category';
import { CategoryId } from '@domain/value-objects/CategoryId';
import { CategoryName } from '@domain/value-objects/CategoryName';
import { Slug } from '@domain/value-objects/Slug';
import { Description } from '@domain/value-objects/Description';
import { SortOrder } from '@domain/value-objects/SortOrder';

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  path: string;
  level: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export const CATEGORY_PRISMA_REPOSITORY = 'CATEGORY_PRISMA_REPOSITORY';

@Injectable()
export class CategoryPrismaRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) return null;

    return this.mapToDomain(record as unknown as CategoryRecord);
  }

  async save(entity: Category): Promise<Category> {
    const path = await this.computePath(entity.parentId?.value ?? null);
    const level = entity.parentId
      ? await this.computeLevel(entity.parentId.value)
      : 0;

    const data = {
      name: entity.name.value,
      slug: entity.slug.value,
      parentId: entity.parentId?.value ?? null,
      path,
      level,
    };

    const existing = await this.prisma.category.findUnique({
      where: { id: entity.id.value },
    });

    if (existing) {
      const updated = await this.prisma.category.update({
        where: { id: entity.id.value },
        data,
      });
      return this.mapToDomain(updated as unknown as CategoryRecord);
    }

    const created = await this.prisma.category.create({
      data: {
        id: entity.id.value,
        ...data,
      },
    });

    return this.mapToDomain(created as unknown as CategoryRecord);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.softDelete({ id });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({
      where: { slug, deletedAt: null },
    });

    if (!record) return null;

    return this.mapToDomain(record as unknown as CategoryRecord);
  }

  async findRoots(): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      where: { parentId: null, deletedAt: null },
    });

    return records.map((r) => this.mapToDomain(r as unknown as CategoryRecord));
  }

  async findByParentId(parentId: string): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      where: { parentId, deletedAt: null },
    });

    return records.map((r) => this.mapToDomain(r as unknown as CategoryRecord));
  }

  async findActive(): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      where: { deletedAt: null },
    });

    return records.map((r) => this.mapToDomain(r as unknown as CategoryRecord));
  }

  async findActiveSorted(): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    return records.map((r) => this.mapToDomain(r as unknown as CategoryRecord));
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: {
        slug,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    return count > 0;
  }

  async hasChildren(id: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { parentId: id, deletedAt: null },
    });

    return count > 0;
  }

  private async computePath(parentId: string | null): Promise<string> {
    if (!parentId) return '/';

    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { path: true, id: true },
    });

    if (!parent) return '/';

    return `${parent.path}${parent.id}/`;
  }

  private async computeLevel(parentId: string): Promise<number> {
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { level: true },
    });

    if (!parent) return 0;

    return parent.level + 1;
  }

  private mapToDomain(record: CategoryRecord): Category {
    return Category.reconstitute({
      id: CategoryId.create(record.id),
      name: CategoryName.create(record.name),
      slug: Slug.create(record.slug),
      isActive: record.deletedAt === null,
      sortOrder: SortOrder.fromNumber(0),
      description: Description.create(''),
      parentId: record.parentId ? CategoryId.create(record.parentId) : null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
