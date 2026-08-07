import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { Prisma } from '@infrastructure/generated/prisma/client';
import {
  CartStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
} from '@infrastructure/generated/prisma/enums';
import { BadRequestException } from '@nestjs/common';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  ICheckoutUseCase,
  CheckoutInput,
} from '../contracts/ICheckoutUsecase';
import {
  IMergeCartUseCase,
} from '../contracts/IMergeCartUsecase';
import {
  MergeCartInput,
  CartResponse,
} from '../../interfaces/dtos/cart.dto';
import { OrderResponse } from '@modules/order/interfaces/dtos/order.dto';

@Injectable()
export class CheckoutUseCase implements ICheckoutUseCase, IMergeCartUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CheckoutInput): Promise<OrderResponse>;
  async execute(input: MergeCartInput): Promise<CartResponse>;
  async execute(
    input: CheckoutInput | MergeCartInput,
  ): Promise<OrderResponse | CartResponse> {
    if ('cartId' in input) {
      return this.checkout(input);
    }

    return this.merge(input);
  }

  private async checkout(input: CheckoutInput): Promise<OrderResponse> {
    const cart = await this.prisma.cart.findFirst({
      where: { userId: input.userId, status: CartStatus.ACTIVE },
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
        },
      },
    });

    if (!cart || !cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    let shippingAddressJson: Record<string, unknown>;

    if (input.shippingAddressId) {
      const address = await this.prisma.address.findFirst({
        where: { id: input.shippingAddressId, userId: input.userId, deletedAt: null },
      });

      if (!address) {
        throw new ResourceNotFoundException('Address', input.shippingAddressId);
      }

      shippingAddressJson = {
        id: address.id,
        country: address.country,
        city: address.city,
        district: address.district,
        ward: address.ward,
        street: address.street,
        detail: address.detail,
      };
    } else {
      throw new BadRequestException('Shipping address is required');
    }

    for (const item of cart.items) {
      this.assertCartItemCanCheckout(item);
    }

    const checkoutResult = await this.prisma.$transaction(async (tx) => {
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: CartStatus.CHECKING_OUT },
      });

      const groupedItems = new Map<string, typeof cart.items>();
      for (const item of cart.items) {
        const shopId = item.product.shopId;
        const existing = groupedItems.get(shopId) ?? [];
        existing.push(item);
        groupedItems.set(shopId, existing);
      }

      const createdOrders = [];
      for (const [shopId, items] of groupedItems) {
        const totalPrice = items.reduce(
          (sum, item) => sum + Number(item.price) * item.quantity,
          0,
        );

        const sellerId = items[0].product.sellerId;

        const order = await tx.order.create({
          data: {
            buyerId: input.userId,
            sellerId,
            orderType: OrderType.RETAIL,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            totalPrice: totalPrice.toString(),
            shippingAddress: shippingAddressJson as Prisma.InputJsonValue,
            paymentMethod: input.paymentMethod as PaymentMethod,
            notes: undefined,
            items: {
              create: items.map((item) => ({
                shopId,
                productId: item.productId,
                price: item.price,
                quantity: item.quantity,
                productName: item.product.name,
                productImage: item.product.images[0]?.url,
              })),
            },
          },
          include: { items: true },
        });

        for (const item of items) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              reserved: { increment: item.quantity },
              version: { increment: 1 },
            },
          });
        }

        createdOrders.push(order);
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: CartStatus.COMPLETED },
      });

      const paymentMethod = input.paymentMethod ?? PaymentMethod.BANK_TRANSFER;
      const paymentAmount = createdOrders.reduce(
        (sum, order) => sum + Number(order.totalPrice),
        0,
      );
      const payment = await tx.payment.create({
        data: {
          userId: input.userId,
          amount: paymentAmount.toString(),
          status: PaymentStatus.PENDING,
          method: paymentMethod as PaymentMethod,
          items: {
            create: createdOrders.map((order) => ({
              orderId: order.id,
              amount: order.totalPrice,
            })),
          },
        },
        include: { items: true },
      });

      return { orders: createdOrders, payment };
    });

    return {
      ...checkoutResult,
      message: 'Checkout completed successfully',
    } as unknown as OrderResponse;
  }

  private async merge(input: MergeCartInput): Promise<CartResponse> {
    const sessionCart = await this.prisma.cart.findFirst({
      where: { sessionId: input.sessionId, status: CartStatus.ACTIVE },
      include: { items: true },
    });

    if (!sessionCart || !sessionCart.items.length) {
      return this.getCartByUserId(input.userId);
    }

    const userCart = await this.prisma.cart.findFirst({
      where: { userId: input.userId, status: CartStatus.ACTIVE },
      include: { items: true },
    }) ?? await this.prisma.cart.create({
      data: { userId: input.userId, status: CartStatus.ACTIVE },
      include: { items: true },
    });

    for (const sessionItem of sessionCart.items) {
      const existingItem = userCart.items.find(
        (i) => i.productId === sessionItem.productId,
      );

      if (existingItem) {
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + sessionItem.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: sessionItem.productId,
            quantity: sessionItem.quantity,
            price: sessionItem.price,
          },
        });
      }
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: sessionCart.id } });
    await this.prisma.cart.update({
      where: { id: sessionCart.id },
      data: { status: CartStatus.COMPLETED },
    });

    return this.getCartByUserId(input.userId);
  }

  private assertCartItemCanCheckout(
    item: Record<string, unknown>,
  ) {
    const product = item.product as Record<string, unknown>;
    const inventory = product.inventory as Record<string, unknown> | null;
    const availableStock =
      (inventory?.stock as number ?? 0) - (inventory?.reserved as number ?? 0);

    if (product.deletedAt || product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException(
        `Product ${product.id} is no longer available`,
      );
    }

    if (availableStock < (item.quantity as number)) {
      throw new BadRequestException(
        `Not enough stock for product ${product.id}`,
      );
    }
  }

  private async getCartByUserId(userId: string): Promise<CartResponse> {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
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

    return cart as unknown as CartResponse;
  }
}
