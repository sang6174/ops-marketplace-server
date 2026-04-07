import { Injectable, ForbiddenException } from '@nestjs/common';
import { CartStatus } from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import { AddCartItemDto, UpdateCartItemDto } from './dtos';

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return (
      cart ?? {
        items: [],
        status: CartStatus.ACTIVE,
      }
    );
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: dto.variantId,
        isActive: true,
        product: { deletedAt: null },
      },
      include: { product: true },
    });

    if (!variant) {
      throw new ResourceNotFoundException('Product variant', dto.variantId);
    }

    const cart = await this.findOrCreateCart(userId);

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, variantId: dto.variantId },
    });

    if (existingItem) {
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + dto.quantity,
          price: variant.price,
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: dto.variantId,
        quantity: dto.quantity,
        price: variant.price,
      },
    });
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.findActiveCartForUser(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new ResourceNotFoundException('Cart item', itemId);
    }

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return { message: 'Cart item removed' };
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity,
      },
    });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.findActiveCartForUser(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new ResourceNotFoundException('Cart item', itemId);
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { message: 'Cart item removed' };
  }

  async clearCart(userId: string) {
    const cart = await this.findActiveCartForUser(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Cart cleared successfully' };
  }

  private async findOrCreateCart(userId: string) {
    const existingCart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
    });

    if (existingCart) return existingCart;

    return this.prisma.cart.create({
      data: {
        userId,
        status: CartStatus.ACTIVE,
      },
    });
  }

  private async findActiveCartForUser(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
    });

    if (!cart) {
      throw new ResourceNotFoundException('Cart', `user ${userId}`);
    }

    return cart;
  }
}
