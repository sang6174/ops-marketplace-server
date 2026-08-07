import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { CartStatus, ProductStatus } from '@infrastructure/generated/prisma/enums';
import { BadRequestException } from '@nestjs/common';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  IAddItemToCartUseCase,
} from '../contracts/IAddItemToCartUsecase';
import {
  AddItemToCartInput,
  CartResponse,
} from '../../interfaces/dtos/cart.dto';

@Injectable()
export class AddItemToCartUseCase implements IAddItemToCartUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: AddItemToCartInput): Promise<CartResponse> {
    const product = await this.getProductById(input.productId);
    await this.assertAvailableStock(input.productId, input.quantity);

    const cart = await this.findOrCreateCart(input.userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: input.productId,
        },
      },
    });

    if (existingItem) {
      const nextQuantity = existingItem.quantity + input.quantity;
      await this.assertAvailableStock(input.productId, nextQuantity);

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: nextQuantity,
          price: product.retailPrice,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: input.productId,
          quantity: input.quantity,
          price: product.retailPrice,
        },
      });
    }

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

  private async findOrCreateCart(userId?: string) {
    if (!userId) throw new BadRequestException('User ID is required');

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
}
