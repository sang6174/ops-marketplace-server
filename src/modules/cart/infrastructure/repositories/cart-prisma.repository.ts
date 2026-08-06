import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { ICartRepository } from '@domain/repository-contracts/cart-repository.contract';
import { Cart, CartItem } from '@domain/entities/orders/Cart';

export const CART_PRISMA_REPOSITORY = 'CART_PRISMA_REPOSITORY';

@Injectable()
export class CartPrismaRepository implements ICartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Cart | null> {
    const record = await this.prisma.cart.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async save(entity: Cart): Promise<Cart> {
    const existing = await this.prisma.cart.findUnique({
      where: { id: entity.id },
    });

    const itemsData = entity.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.retailPrice,
      wholesalePrice: item.wholesalePrice ?? null,
    }));

    if (existing) {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.cart.update({
          where: { id: entity.id },
          data: {
            userId: entity.userId,
            sessionId: entity.sessionId,
          },
        });

        await tx.cartItem.deleteMany({
          where: { cartId: entity.id },
        });

        if (itemsData.length > 0) {
          await tx.cartItem.createMany({
            data: itemsData.map((item) => ({
              ...item,
              cartId: entity.id,
            })),
          });
        }

        return tx.cart.findUnique({
          where: { id: entity.id },
          include: {
            items: {
              include: { product: true },
            },
          },
        });
      });

      return this.mapToDomain(updated!);
    }

    const created = await this.prisma.cart.create({
      data: {
        id: entity.id,
        userId: entity.userId,
        sessionId: entity.sessionId,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    return this.mapToDomain(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.cart.softDelete({ id });
  }

  async findByUserId(userId: string): Promise<Cart | null> {
    const record = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async findBySessionId(sessionId: string): Promise<Cart | null> {
    const record = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.cart.updateMany({
      where: { userId },
      data: { deletedAt: new Date() } as any,
    });
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.prisma.cart.updateMany({
      where: { sessionId },
      data: { deletedAt: new Date() } as any,
    });
  }

  private mapToDomain(record: Record<string, unknown>): Cart {
    const items: CartItem[] = (
      (record.items as Array<Record<string, unknown>>) ?? []
    ).map((item) => {
      const product = item.product as Record<string, unknown>;
      return new CartItem(
        product.shopId as string,
        item.productId as string,
        item.quantity as number,
        Number(item.price),
        item.wholesalePrice != null ? Number(item.wholesalePrice) : undefined,
      );
    });

    return Cart.reconstitute({
      id: record.id as string,
      userId: (record.userId as string) ?? null,
      sessionId: (record.sessionId as string) ?? null,
      items,
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
    });
  }
}
