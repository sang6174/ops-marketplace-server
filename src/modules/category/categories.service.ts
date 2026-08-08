import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@infrastructure/generated/prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  CATEGORY_PRISMA_REPOSITORY,
} from './infrastructure/repositories/category-prisma.repository';
import { ICategoryRepository } from '@domain/repository-contracts/category-repository.contract';
import { paginate } from '@common/dtos/pagination.dto';
import { toPrismaPage } from '@common/utils';
import { ProductStatus } from '@infrastructure/generated/prisma/enums';
import {
  CreateCategoryDto,
  QueryCategoryProductsDto,
  UpdateCategoryDto,
} from './dtos/categories.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CATEGORY_PRISMA_REPOSITORY)
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { path: 'asc' },
    });

    return this.buildTree(categories);
  }

  async getChildren(id: string) {
    await this.getCategoryOrThrow(id);

    return this.prisma.category.findMany({
      where: { parentId: id, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async getCategory(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: {
        parent: true,
        children: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            productCategoryMappings: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async getProducts(id: string, dto: QueryCategoryProductsDto) {
    await this.getCategoryOrThrow(id);

    const { page = 1, limit = 20, search, status } = dto;
    const where = {
      categoryId: id,
      product: {
        deletedAt: null,
        status: status ?? ProductStatus.ACTIVE,
        ...(search && {
          name: { contains: search, mode: 'insensitive' as const },
        }),
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.productCategoryMapping.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: {
          product: {
            include: {
              shop: { select: { id: true, name: true } },
               images: true,
               stats: true,
            },
          },
        },
        orderBy: { product: { createdAt: 'desc' } },
      }),
      this.prisma.productCategoryMapping.count({ where }),
    ]);

    return paginate(
      (items as Array<{ product: unknown }>).map((item) => item.product),
      total,
      page,
      limit,
    );
  }

  async createCategory(dto: CreateCategoryDto) {
    let path = '';
    let level = 0;

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }

      path = `${parent.path}/${dto.slug}`;
      level = parent.level + 1;
    } else {
      path = `/${dto.slug}`;
      level = 0;
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        parentId: dto.parentId,
        path,
        level,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.parentId && dto.parentId !== category.parentId) {
      throw new BadRequestException(
        'Changing parent is not supported (avoid tree corruption)',
      );
    }

    const slug = dto.slug ?? category.slug;

    let path = '';
    let level = 0;

    if (category.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: category.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }

      path = `${parent.path}/${slug}`;
      level = parent.level + 1;
    } else {
      path = `/${slug}`;
      level = 0;
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        path,
        level,
      },
    });
  }

  async deleteCategory(id: string) {
    const children = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (children > 0) {
      throw new BadRequestException('Cannot delete category with children');
    }

    const used = await this.prisma.productCategoryMapping.count({
      where: { categoryId: id },
    });

    if (used > 0) {
      throw new BadRequestException('Cannot delete category in use');
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return;
  }

  // ===== Internal Helpers =====

  private async getCategoryOrThrow(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private buildTree(categories: any[]) {
    const map = new Map<string, any>();
    const roots: any[] = [];

    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat) => {
      const node = map.get(cat.id);

      if (cat.parentId) {
        const parent = map.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
