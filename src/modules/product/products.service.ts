// src/modules/product/products.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import { toPrismaPage } from '@common/utils';
import { ProductStatus } from '@infrastructure/generated/prisma/enums';
import {
  AddVariantDto,
  BulkUpdateInventoryDto,
  CreateProductDto,
  CreateProductImageDto,
  CreateVariantImageDto,
  QueryProductsDto,
  SellerUpdateProductDto,
  SetInventoryDto,
  UpdateVariantDto,
} from './dtos/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getVariants(productId: string) {
    await this.getProduct(productId);

    return this.prisma.productVariant.findMany({
      where: { productId, deletedAt: null, isActive: true },
      include: this.variantInclude(),
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
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
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          status: ProductStatus.DRAFT,
          isFeatured: false,
          categories: dto.categoryIds?.length
            ? {
                create: dto.categoryIds.map((categoryId) => ({ categoryId })),
              }
            : undefined,
        },
      });

      if (dto.variants?.length) {
        for (const variantDto of dto.variants) {
          await this.createVariantWithTx(tx, shopId, product.id, variantDto);
        }
      }

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
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(id, shopId);

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Product deleted' };
  }

  async publishProduct(userId: string, id: string) {
    return this.updateProductStatus(userId, id, ProductStatus.ACTIVE);
  }

  async unpublishProduct(userId: string, id: string) {
    return this.updateProductStatus(userId, id, ProductStatus.INACTIVE);
  }

  async archiveProduct(userId: string, id: string) {
    return this.updateProductStatus(userId, id, ProductStatus.ARCHIVED);
  }

  async duplicateProduct(userId: string, id: string) {
    const shopId = await this.getShopId(userId);
    const product = await this.checkProductOwnership(id, shopId);

    return this.prisma.$transaction(async (tx) => {
      const duplicated = await tx.product.create({
        data: {
          shopId,
          name: `${product.name} Copy`,
          slug: `${product.slug}-copy-${Date.now()}`,
          description: product.description,
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

      for (const variant of product.variants) {
        const createdVariant = await tx.productVariant.create({
          data: {
            shopId,
            productId: duplicated.id,
            sku: `${variant.sku}-copy-${Date.now()}`,
            name: variant.name,
            price: variant.price,
            isDefault: variant.isDefault,
            isActive: false,
            inventory: variant.inventory
              ? { create: { stock: variant.inventory.stock } }
              : undefined,
          },
        });

        if (variant.attributes.length) {
          await tx.variantAttribute.createMany({
            data: variant.attributes.map((item) => ({
              variantId: createdVariant.id,
              attributeValueId: item.attributeValueId,
            })),
          });
        }
      }

      return tx.product.findUnique({
        where: { id: duplicated.id },
        include: this.productDetailInclude(),
      });
    });
  }

  async getSellerVariants(userId: string, productId: string) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(productId, shopId);

    return this.prisma.productVariant.findMany({
      where: { productId, shopId, deletedAt: null },
      include: this.variantInclude(),
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async addVariant(userId: string, productId: string, dto: AddVariantDto) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(productId, shopId);

    return this.prisma.$transaction((tx) =>
      this.createVariantWithTx(tx, shopId, productId, dto),
    );
  }

  async createVariant(userId: string, dto: AddVariantDto) {
    if (!dto.productId) {
      throw new BadRequestException('productId is required');
    }

    return this.addVariant(userId, dto.productId, dto);
  }

  async updateVariant(
    userId: string,
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(productId, shopId);
    const variant = await this.checkVariantOwnership(
      variantId,
      shopId,
      productId,
    );

    return this.updateVariantData(variant, dto);
  }

  async updateVariantById(
    userId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    const shopId = await this.getShopId(userId);
    const variant = await this.checkVariantOwnership(variantId, shopId);

    return this.updateVariantData(variant, dto);
  }

  async deleteVariant(userId: string, productId: string, variantId: string) {
    const shopId = await this.getShopId(userId);
    await this.checkVariantOwnership(variantId, shopId, productId);

    return this.deleteVariantById(userId, variantId);
  }

  async deleteVariantById(userId: string, variantId: string) {
    const shopId = await this.getShopId(userId);
    await this.checkVariantOwnership(variantId, shopId);

    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { message: 'Variant deleted' };
  }

  async setDefaultVariant(userId: string, variantId: string) {
    const shopId = await this.getShopId(userId);
    const variant = await this.checkVariantOwnership(variantId, shopId);

    return this.prisma.$transaction(async (tx) => {
      await tx.productVariant.updateMany({
        where: { productId: variant.productId, shopId },
        data: { isDefault: false },
      });

      return tx.productVariant.update({
        where: { id: variantId },
        data: { isDefault: true },
        include: this.variantInclude(),
      });
    });
  }

  async adjustInventory(
    userId: string,
    productId: string,
    variantId: string,
    dto: { quantity: number },
  ) {
    const shopId = await this.getShopId(userId);
    await this.checkVariantOwnership(variantId, shopId, productId);

    return this.prisma.inventory.upsert({
      where: { variantId },
      create: { variantId, stock: dto.quantity },
      update: { stock: { increment: dto.quantity }, version: { increment: 1 } },
    });
  }

  async listInventory(userId: string, dto: QueryProductsDto) {
    const shopId = await this.getShopId(userId);
    const { page = 1, limit = 20 } = dto;
    const where = {
      variant: {
        shopId,
        deletedAt: null,
        product: { deletedAt: null },
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        ...toPrismaPage(page, limit),
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async updateInventory(
    userId: string,
    variantId: string,
    dto: SetInventoryDto,
  ) {
    const shopId = await this.getShopId(userId);
    await this.checkVariantOwnership(variantId, shopId);

    return this.prisma.inventory.upsert({
      where: { variantId },
      create: { variantId, stock: dto.stock },
      update: { stock: dto.stock, version: { increment: 1 } },
    });
  }

  async bulkUpdateInventory(userId: string, dto: BulkUpdateInventoryDto) {
    const shopId = await this.getShopId(userId);

    return this.prisma.$transaction(async (tx) => {
      const updated = [];

      for (const item of dto.items) {
        const variant = await tx.productVariant.findFirst({
          where: { id: item.variantId, shopId, deletedAt: null },
        });
        if (!variant) {
          throw new ResourceNotFoundException('Variant', item.variantId);
        }

        updated.push(
          await tx.inventory.upsert({
            where: { variantId: item.variantId },
            create: { variantId: item.variantId, stock: item.stock },
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

  async addVariantImage(
    userId: string,
    variantId: string,
    dto: CreateVariantImageDto,
  ) {
    const shopId = await this.getShopId(userId);
    await this.checkVariantOwnership(variantId, shopId);

    return this.prisma.variantImage.create({
      data: {
        variantId,
        url: dto.url,
      },
    });
  }

  private async updateProductStatus(
    userId: string,
    id: string,
    status: ProductStatus,
  ) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(id, shopId);

    return this.prisma.product.update({
      where: { id },
      data: { status },
      include: this.productDetailInclude(),
    });
  }

  private async updateVariantData(
    variant: { id: string; productId: string; shopId: string },
    dto: UpdateVariantDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.productVariant.updateMany({
          where: {
            productId: variant.productId,
            shopId: variant.shopId,
            NOT: { id: variant.id },
          },
          data: { isDefault: false },
        });
      }

      const updated = await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          sku: dto.sku,
          name: dto.name,
          price: dto.price,
          isDefault: dto.isDefault,
          isActive: dto.isActive,
          inventory: dto.inventory
            ? {
                upsert: {
                  create: { stock: dto.inventory.stock },
                  update: { stock: dto.inventory.stock },
                },
              }
            : undefined,
        },
      });

      if (dto.attributes) {
        await tx.variantAttribute.deleteMany({
          where: { variantId: variant.id },
        });

        if (dto.attributes.length) {
          const attributeValueIds = dto.attributes.map(
            (item) => item.attributeValueId,
          );
          const existingValues = await tx.attributeValue.findMany({
            where: { id: { in: attributeValueIds } },
            select: { id: true },
          });
          if (existingValues.length !== attributeValueIds.length) {
            throw new BadRequestException('Invalid attributeValueId');
          }

          await tx.variantAttribute.createMany({
            data: attributeValueIds.map((attributeValueId) => ({
              variantId: variant.id,
              attributeValueId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.productVariant.findUnique({
        where: { id: updated.id },
        include: this.variantInclude(),
      });
    });
  }

  private async createVariantWithTx(
    tx: any,
    shopId: string,
    productId: string,
    dto: AddVariantDto,
  ) {
    const variant = await tx.productVariant.create({
      data: {
        shopId,
        productId,
        sku: dto.sku,
        name: dto.name,
        price: dto.price,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        inventory: dto.inventory
          ? { create: { stock: dto.inventory.stock } }
          : undefined,
      },
    });

    if (dto.isDefault) {
      await tx.productVariant.updateMany({
        where: { productId, shopId, NOT: { id: variant.id } },
        data: { isDefault: false },
      });
    }

    if (dto.attributes?.length) {
      const attributeValueIds = dto.attributes.map(
        (item) => item.attributeValueId,
      );
      const existingValues = await tx.attributeValue.findMany({
        where: { id: { in: attributeValueIds } },
        select: { id: true },
      });
      if (existingValues.length !== attributeValueIds.length) {
        throw new BadRequestException('Invalid attributeValueId');
      }

      await tx.variantAttribute.createMany({
        data: attributeValueIds.map((attributeValueId) => ({
          variantId: variant.id,
          attributeValueId,
        })),
        skipDuplicates: true,
      });
    }

    return tx.productVariant.findUnique({
      where: { id: variant.id },
      include: this.variantInclude(),
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
        variants: {
          where: { deletedAt: null },
          include: {
            inventory: true,
            attributes: true,
          },
        },
      },
    });

    if (!product) {
      throw new ResourceNotFoundException('Product', productId);
    }

    return product;
  }

  private async checkVariantOwnership(
    variantId: string,
    shopId: string,
    productId?: string,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        shopId,
        deletedAt: null,
        ...(productId && { productId }),
      },
      include: this.variantInclude(),
    });

    if (!variant) throw new ResourceNotFoundException('Variant', variantId);
    return variant;
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
      variants: {
        where: { deletedAt: null, isActive: true },
        include: this.variantInclude(),
      },
    };
  }

  private variantInclude() {
    return {
      inventory: true,
      images: true,
      attributes: {
        include: {
          attributeValue: {
            include: { attribute: true },
          },
        },
      },
    };
  }
}
