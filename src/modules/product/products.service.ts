// src/modules/product/products.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  PRODUCT_PRISMA_REPOSITORY,
} from './infrastructure/repositories/product-prisma.repository';
import { IProductRepository } from '@domain/repository-contracts/product-repository.contract';
import { ResourceNotFoundException } from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import { toPrismaPage } from '@common/utils';
import {
  ProductCategory,
  ProductStatus,
  ProductUnit,
} from '@infrastructure/generated/prisma/enums';
import { ProductStatus as DomainProductStatus } from '@domain/entities/enums.enum';
import {
  BulkUpdateInventoryDto,
  CreateProductDto,
  CreateProductImageDto,
  QueryProductsDto,
  SellerUpdateProductDto,
  SetInventoryDto,
} from './dtos/product.dto';
import { UpdateProductUseCase } from './applications/use-cases/update-product.usecase';
import { DeleteProductUseCase } from './applications/use-cases/delete-product.usecase';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRODUCT_PRISMA_REPOSITORY)
    private readonly productRepo: IProductRepository,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
  ) {}

  async listProducts(dto: QueryProductsDto) {
    const { page = 1, limit = 20 } = dto;
    const where = this.buildPublicProductWhere(dto);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: this.productInclude(),
        orderBy: this.buildProductOrderBy(dto),
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async listFeaturedProducts(dto: QueryProductsDto) {
    const { page = 1, limit = 20 } = dto;
    const where = this.buildPublicProductWhere({
      ...dto,
      featuredOnly: true,
    });

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: this.productInclude(),
        orderBy: this.buildProductOrderBy(dto),
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null, status: ProductStatus.ACTIVE },
      include: this.productDetailInclude(),
    });

    if (!product) throw new ResourceNotFoundException('Product', id);
    return product;
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null, status: ProductStatus.ACTIVE },
      include: this.productDetailInclude(),
    });

    if (!product) throw new ResourceNotFoundException('Product', slug);
    return product;
  }

  async getReviews(productId: string, dto: QueryProductsDto) {
    await this.getProduct(productId);

    const { page = 1, limit = 20 } = dto;
    const where = { productId, deletedAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async listMyProducts(userId: string, dto: QueryProductsDto) {
    const shopId = await this.getShopId(userId);
    const { page = 1, limit = 20, search, status } = dto;
    const where = {
      shopId,
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: this.productDetailInclude(),
        orderBy: this.buildProductOrderBy(dto),
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const shopId = await this.getShopId(userId);
    await this.assertCategories(dto.categoryIds);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          shopId,
          sellerId: userId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          category: ProductCategory.OTHER,
          unit: ProductUnit.PIECE,
          retailPrice: 0,
          status: ProductStatus.DRAFT,
          isFeatured: false,
          categories: dto.categoryIds?.length
            ? {
                create: dto.categoryIds.map((categoryId) => ({ categoryId })),
              }
            : undefined,
        },
      });

      return tx.product.findUnique({
        where: { id: product.id },
        include: this.productDetailInclude(),
      });
    });
  }

  async updateProduct(userId: string, id: string, dto: SellerUpdateProductDto) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(id, shopId);
    await this.assertCategories(dto.categoryIds);

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        categories: dto.categoryIds
          ? {
              deleteMany: {},
              create: dto.categoryIds.map((categoryId) => ({ categoryId })),
            }
          : undefined,
      },
      include: this.productDetailInclude(),
    });
  }

  async deleteProduct(userId: string, id: string) {
    await this.deleteProductUseCase.delete({
      productId: id,
      sellerId: userId,
    });

    return { message: 'Product deleted' };
  }

  async publishProduct(userId: string, id: string) {
    return this.updateProductUseCase.publish({
      productId: id,
      sellerId: userId,
    });
  }

  async unpublishProduct(userId: string, id: string) {
    return this.updateProductUseCase.unpublish({
      productId: id,
      sellerId: userId,
    });
  }

  async archiveProduct(userId: string, id: string) {
    return this.updateProductUseCase.updateStatus({
      productId: id,
      sellerId: userId,
      status: DomainProductStatus.DISCONTINUED,
    });
  }

  async duplicateProduct(userId: string, id: string) {
    const shopId = await this.getShopId(userId);
    const product = await this.checkProductOwnership(id, shopId);

    return this.prisma.$transaction(async (tx) => {
      const duplicated = await tx.product.create({
        data: {
          shopId,
          sellerId: userId,
          name: `${product.name} Copy`,
          slug: `${product.slug}-copy-${Date.now()}`,
          description: product.description,
          category: product.category,
          unit: product.unit,
          retailPrice: product.retailPrice,
          status: ProductStatus.DRAFT,
          isFeatured: false,
          categories: {
            create: product.categories.map((item) => ({
              categoryId: item.categoryId,
            })),
          },
          images: {
            create: product.images.map((image) => ({
              url: image.url,
              isPrimary: image.isPrimary,
              sortOrder: image.sortOrder,
            })),
          },
        },
      });

      return tx.product.findUnique({
        where: { id: duplicated.id },
        include: this.productDetailInclude(),
      });
    });
  }

  async listInventory(userId: string, dto: QueryProductsDto) {
    const shopId = await this.getShopId(userId);
    const { page = 1, limit = 20 } = dto;
    const where = {
      product: { shopId, deletedAt: null },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: {
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async updateInventory(
    userId: string,
    productId: string,
    dto: SetInventoryDto,
  ) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(productId, shopId);

    return this.prisma.inventory.upsert({
      where: { productId },
      create: { productId, stock: dto.stock },
      update: { stock: dto.stock, version: { increment: 1 } },
    });
  }

  async bulkUpdateInventory(userId: string, dto: BulkUpdateInventoryDto) {
    const shopId = await this.getShopId(userId);

    return this.prisma.$transaction(async (tx) => {
      const updated = [];

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, shopId, deletedAt: null },
        });
        if (!product) {
          throw new ResourceNotFoundException('Product', item.productId);
        }

        updated.push(
          await tx.inventory.upsert({
            where: { productId: item.productId },
            create: { productId: item.productId, stock: item.stock },
            update: { stock: item.stock, version: { increment: 1 } },
          }),
        );
      }

      return updated;
    });
  }

  async addProductImage(
    userId: string,
    productId: string,
    dto: CreateProductImageDto,
  ) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(productId, shopId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }

      return tx.productImage.create({
        data: {
          productId,
          url: dto.url,
          isPrimary: dto.isPrimary ?? false,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    });
  }

  async deleteProductImage(userId: string, imageId: string) {
    await this.checkProductImageOwnership(userId, imageId);
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { message: 'Product image deleted' };
  }

  async setPrimaryProductImage(userId: string, imageId: string) {
    const image = await this.checkProductImageOwnership(userId, imageId);

    return this.prisma.$transaction(async (tx) => {
      await tx.productImage.updateMany({
        where: { productId: image.productId },
        data: { isPrimary: false },
      });

      return tx.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      });
    });
  }

  private async getShopId(userId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    });

    if (!shop) throw new ResourceNotFoundException('Shop');
    return shop.id;
  }

  private async checkProductOwnership(productId: string, shopId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId, deletedAt: null },
      include: {
        categories: true,
        images: true,
      },
    });

    if (!product) {
      throw new ResourceNotFoundException('Product', productId);
    }

    return product;
  }

  private async checkProductImageOwnership(userId: string, imageId: string) {
    const shopId = await this.getShopId(userId);
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        product: { shopId },
      },
    });

    if (!image) throw new ResourceNotFoundException('Product image', imageId);
    return image;
  }

  private async assertCategories(categoryIds?: string[]) {
    if (!categoryIds?.length) return;

    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds }, deletedAt: null },
      select: { id: true },
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('Invalid categoryIds');
    }
  }

  private buildPublicProductWhere(
    dto: QueryProductsDto & { featuredOnly?: boolean },
  ) {
    return {
      deletedAt: null,
      status: ProductStatus.ACTIVE,
      ...(dto.featuredOnly && { isFeatured: true }),
      ...(dto.shopId && { shopId: dto.shopId }),
      ...(dto.search && {
        name: { contains: dto.search, mode: 'insensitive' as const },
      }),
      ...(dto.categoryId && {
        categories: { some: { categoryId: dto.categoryId } },
      }),
    };
  }

  private buildProductOrderBy(dto: QueryProductsDto) {
    const sortOrder = dto.sortOrder ?? 'desc';

    if (dto.sortBy === 'name') return { name: sortOrder };
    if (dto.sortBy === 'price') return { stats: { minPrice: sortOrder } };

    return { createdAt: sortOrder };
  }

  private productInclude() {
    return {
      shop: { select: { id: true, name: true } },
      images: true,
      stats: true,
    };
  }

  private productDetailInclude() {
    return {
      shop: { select: { id: true, name: true } },
      images: true,
      stats: true,
      categories: { include: { category: true } },
    };
  }
}
