// src/modules/product
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  AddVariantDto,
  UpdateVariantDto,
  AdjustInventoryDto,
} from './dtos/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProduct(userId: string, dto: CreateProductDto) {
    const shopId = await this.getShopId(userId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.categoryIds?.length) {
        const categories = await tx.category.findMany({
          where: { id: { in: dto.categoryIds } },
          select: { id: true },
        });

        if (categories.length !== dto.categoryIds.length) {
          throw new Error('Invalid categoryIds');
        }
      }

      const product = await tx.product.create({
        data: {
          shopId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          status: dto.status,
          isFeatured: dto.isFeatured,

          categories: dto.categoryIds
            ? {
                create: dto.categoryIds.map((categoryId) => ({
                  categoryId,
                })),
              }
            : undefined,

          variants: dto.variants
            ? {
                create: dto.variants.map((v) => ({
                  sku: v.sku,
                  name: v.name,
                  price: v.price,

                  isDefault: v.isDefault,
                  isActive: v.isActive,

                  inventory: v.inventory
                    ? {
                        create: {
                          stock: v.inventory.stock,
                        },
                      }
                    : undefined,
                })),
              }
            : undefined,
        },
      });

      return product;
    });
  }

  async updateProduct(userId: string, id: string, dto: UpdateProductDto) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(id, shopId);

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        status: dto.status,
        isFeatured: dto.isFeatured,

        categories: dto.categoryIds
          ? {
              deleteMany: {},
              create: dto.categoryIds.map((categoryId) => ({
                categoryId,
              })),
            }
          : undefined,
      },
    });
  }

  async archiveProduct(userId: string, id: string) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(id, shopId);

    return this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });
  }

  async publishProduct(userId: string, id: string) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(id, shopId);

    return this.prisma.product.update({
      where: { id },
      data: {
        status: 'ACTIVE',
      },
    });
  }

  async addVariant(userId: string, productId: string, dto: AddVariantDto) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(productId, shopId);

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({
        data: {
          productId,
          sku: dto.sku,
          name: dto.name,
          price: dto.price,

          isDefault: dto.isDefault,
          isActive: dto.isActive,

          inventory: dto.inventory
            ? {
                create: {
                  stock: dto.inventory.stock,
                },
              }
            : undefined,
        },
      });

      if (dto.attributes?.length) {
        const attributeValueIds = dto.attributes.map((a) => a.value);

        const existingValues = await tx.attributeValue.findMany({
          where: {
            id: { in: attributeValueIds },
          },
          select: { id: true },
        });

        if (existingValues.length !== attributeValueIds.length) {
          throw new Error('Invalid attributeValueId');
        }

        await tx.variantAttribute.createMany({
          data: attributeValueIds.map((id) => ({
            variantId: variant.id,
            attributeValueId: id,
          })),
          skipDuplicates: true,
        });
      }

      return variant;
    });
  }

  async updateVariant(
    userId: string,
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(productId, shopId);

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        sku: dto.sku,
        name: dto.name,
        price: dto.price,
        isDefault: dto.isDefault,
        isActive: dto.isActive,

        inventory: dto.inventory
          ? {
              upsert: {
                create: {
                  stock: dto.inventory.stock,
                },
                update: {
                  stock: dto.inventory.stock,
                },
              },
            }
          : undefined,
      },
    });
  }

  async deleteVariant(userId: string, productId: string, variantId: string) {
    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        isActive: false,
      },
    });
    return;
  }

  async adjustInventory(
    userId: string,
    productId: string,
    variantId: string,
    dto: AdjustInventoryDto,
  ) {
    const shopId = await this.getShopId(userId);
    await this.checkProductOwnership(productId, shopId);

    return this.prisma.inventory.update({
      where: { variantId },
      data: {
        stock: {
          increment: dto.quantity,
        },
      },
    });
  }

  async listProducts() {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        images: true,
        stats: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProduct(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        variants: {
          include: {
            inventory: true,
            images: true,
            attributes: true,
          },
        },
        stats: true,
      },
    });
  }

  async getVariants(productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      include: {
        inventory: true,
        images: true,
        attributes: true,
      },
    });
  }

  // ===== Internal Helpers =====
  private async getShopId(userId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!shop) throw new Error('Shop not found');

    return shop.id;
  }

  private async checkProductOwnership(productId: string, shopId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId },
    });

    if (!product) throw new Error('Product not found or no permission');

    return product;
  }
}
