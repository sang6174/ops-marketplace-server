import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dtos/categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      orderBy: { path: 'asc' },
    });

    return this.buildTree(categories);
  }

  async getChildren(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.category.findMany({
      where: { parentId: id },
      orderBy: { name: 'asc' },
    });
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

    const used = await this.prisma.productCategory.count({
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
