import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CartStatus,
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  CART_PRISMA_REPOSITORY,
} from './infrastructure/repositories/cart-prisma.repository';
import { ICartRepository } from '@domain/repository-contracts/cart-repository.contract';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  AddCartItemDto,
  ApplyCouponDto,
  CheckoutCartDto,
  UpdateCartItemDto,
} from './dtos';
import { AddItemToCartUseCase } from './applications/use-cases/add-item.usecase';
import { GetCartUseCase } from './applications/use-cases/get-cart.usecase';
import { UpdateCartUseCase } from './applications/use-cases/update-cart.usecase';
import { CheckoutUseCase } from './applications/use-cases/checkout.usecase';

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CART_PRISMA_REPOSITORY)
    private readonly cartRepo: ICartRepository,
    private readonly addItemUseCase: AddItemToCartUseCase,
    private readonly getCartUseCase: GetCartUseCase,
    private readonly updateCartUseCase: UpdateCartUseCase,
    private readonly checkoutUseCase: CheckoutUseCase,
  ) {}

  async getCart(userId: string) {
    return this.getCartUseCase.execute({ userId });
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    return this.addItemUseCase.execute({ userId, ...dto } as any);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    return this.updateCartUseCase.execute({
      userId,
      productId: itemId,
      quantity: dto.quantity,
    });
  }

  async removeItem(userId: string, itemId: string) {
    return this.updateCartUseCase.execute({ userId, productId: itemId });
  }

  async clearCart(userId: string) {
    return this.updateCartUseCase.execute({ userId });
  }

  async applyCoupon(userId: string, dto: ApplyCouponDto) {
    await this.findActiveCartForUser(userId);

    throw new BadRequestException(
      `Coupon "${dto.code}" cannot be applied because coupon storage is not configured`,
    );
  }

  async removeCoupon(userId: string) {
    await this.findActiveCartForUser(userId);
    return {
      message: 'No coupon is currently stored on cart',
      summary: await this.getSummary(userId),
    };
  }

  async checkout(userId: string, dto: CheckoutCartDto) {
    return this.checkoutUseCase.execute({
      userId,
      cartId: '',
      shippingAddressId: dto.addressId ?? '',
      paymentMethod: dto.paymentMethod ?? '',
    });
  }

  async getSummary(userId: string) {
    const cart = await this.findOrCreateCart(userId);
    const fullCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
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
    });

    if (!fullCart) throw new ResourceNotFoundException('Cart', cart.id);

    const items = fullCart.items ?? [];
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );

    return {
      cartId: fullCart.id,
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: subtotal.toString(),
      discount: '0',
      total: subtotal.toString(),
    };
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
