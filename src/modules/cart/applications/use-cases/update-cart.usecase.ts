import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { CartStatus, ProductStatus } from '@infrastructure/generated/prisma/enums';
import { BadRequestException } from '@nestjs/common';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  IUpdateCartItemUseCase,
} from '../contracts/IUpdateCartItemUseCase';
import {
  IRemoveCartItemUseCase,
} from '../contracts/IRemoveItemFromCartUsecase';
import {
  IClearCartUseCase,
  ClearCartInput,
} from '../contracts/IClearCartUsecase';
import {
  UpdateCartItemInput,
  RemoveCartItemInput,
  CartResponse,
} from '../../interfaces/dtos/cart.dto';

@Injectable()
export class UpdateCartUseCase implements IUpdateCartItemUseCase, IRemoveCartItemUseCase, IClearCartUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: UpdateCartItemInput): Promise<CartResponse>;
  async execute(input: RemoveCartItemInput): Promise<CartResponse>;
  async execute(input: ClearCartInput): Promise<CartResponse>;
  async execute(
    input: UpdateCartItemInput | RemoveCartItemInput | ClearCartInput,
  ): Promise<CartResponse> {
    if ('productId' in input && 'quantity' in input) {
      return this.updateItem(input);
    }

    if ('productId' in input) {
      return this.removeItem(input);
    }

    return this.clearCart(input);
  }

  private async updateItem(input: UpdateCartItemInput): Promise<CartResponse> {
    const cart = await this.findActiveCart(input.userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: input.productId,
        },
      },
    });

    if (!existingItem) {
      throw new ResourceNotFoundException('Cart item', input.productId);
    }

    if (input.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: existingItem.id } });
      return this.getCartById(cart.id);
    }

    await this.assertAvailableStock(input.productId, input.quantity);
    await this.prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: input.quantity },
    });

    return this.getCartById(cart.id);
  }

  private async removeItem(input: RemoveCartItemInput): Promise<CartResponse> {
    const cart = await this.findActiveCart(input.userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: input.productId,
        },
      },
    });

    if (!existingItem) {
      throw new ResourceNotFoundException('Cart item', input.productId);
    }

    await this.prisma.cartItem.delete({ where: { id: existingItem.id } });
    return this.getCartById(cart.id);
  }

  private async clearCart(input: ClearCartInput): Promise<CartResponse> {
    const cart = await this.findActiveCart(input.userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getCartById(cart.id);
  }

  private async getCartById(cartId: string) {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventory: true,
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                },
                shop: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }) as unknown as CartResponse;
  }

  private async findActiveCart(userId?: string) {
    if (!userId) throw new BadRequestException('User ID is required');

    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
    });

    if (!cart) {
      throw new ResourceNotFoundException('Cart', `user ${userId}`);
    }

    return cart;
  }

  private async getProductById(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        status: ProductStatus.ACTIVE,
      },
      include: { inventory: true },
    });

    if (!product) {
      throw new ResourceNotFoundException('Product', productId);
    }

    return product;
  }

  private async assertAvailableStock(productId: string, quantity: number) {
    const product = await this.getProductById(productId);
    const availableStock =
      (product.inventory?.stock ?? 0) - (product.inventory?.reserved ?? 0);

    if (availableStock < quantity) {
      throw new BadRequestException('Not enough stock for this product');
    }
  }
}
