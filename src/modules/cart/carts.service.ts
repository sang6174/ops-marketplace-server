import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CartStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  AddCartItemDto,
  ApplyCouponDto,
  CheckoutCartDto,
  UpdateCartItemDto,
} from './dtos';

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.findOrCreateCart(userId);
    return this.getCartById(cart.id);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const variant = await this.getPurchasableVariant(dto.variantId);
    await this.assertAvailableStock(dto.variantId, dto.quantity);
    const cart = await this.findOrCreateCart(userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId: dto.variantId,
        },
      },
    });

    if (existingItem) {
      const nextQuantity = existingItem.quantity + dto.quantity;
      await this.assertAvailableStock(dto.variantId, nextQuantity);

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: nextQuantity,
          price: variant.price,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: dto.variantId,
          quantity: dto.quantity,
          price: variant.price,
        },
      });
    }

    return this.getCartById(cart.id);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.findActiveCartForUser(userId);
    const item = await this.findCartItem(cart.id, itemId);

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return this.getCartById(cart.id);
    }

    await this.assertAvailableStock(item.variantId, dto.quantity);
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCartById(cart.id);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.findActiveCartForUser(userId);
    await this.findCartItem(cart.id, itemId);

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCartById(cart.id);
  }

  async clearCart(userId: string) {
    const cart = await this.findActiveCartForUser(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getCartById(cart.id);
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
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventory: true,
                images: true,
                product: {
                  include: {
                    images: {
                      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                    },
                  },
                },
                attributes: {
                  include: {
                    attributeValue: {
                      include: { attribute: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || !cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId, deletedAt: null },
    });

    if (!address) {
      throw new ResourceNotFoundException('Address', dto.addressId);
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
        const shopId = item.variant.product.shopId;
        groupedItems.set(shopId, [...(groupedItems.get(shopId) ?? []), item]);
      }

      const createdOrders = [];
      for (const [shopId, items] of groupedItems) {
        const totalPrice = items.reduce(
          (sum, item) => sum + Number(item.price) * item.quantity,
          0,
        );

        const order = await tx.order.create({
          data: {
            userId,
            shopId,
            addressId: dto.addressId,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            totalPrice: totalPrice.toString(),
            items: {
              create: items.map((item) => ({
                shopId,
                variantId: item.variantId,
                price: item.price,
                quantity: item.quantity,
                productName: item.variant.product.name,
                variantName: item.variant.name,
                sku: item.variant.sku,
                productImage: item.variant.product.images[0]?.url,
                attributes: this.mapVariantAttributes(item.variant.attributes),
              })),
            },
          },
          include: { items: true, address: true },
        });

        for (const item of items) {
          await tx.inventory.update({
            where: { variantId: item.variantId },
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

      const paymentMethod = dto.paymentMethod ?? PaymentMethod.COD;
      const paymentAmount = createdOrders.reduce(
        (sum, order) => sum + Number(order.totalPrice),
        0,
      );
      const payment = await tx.payment.create({
        data: {
          userId,
          amount: paymentAmount.toString(),
          status: PaymentStatus.PENDING,
          method: paymentMethod,
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
    };
  }

  async getSummary(userId: string) {
    const cart = await this.findOrCreateCart(userId);
    const fullCart = await this.getCartById(cart.id);
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

  private async getCartById(cartId: string) {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventory: true,
                images: true,
                product: {
                  include: {
                    images: {
                      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                    },
                    shop: { select: { id: true, name: true } },
                  },
                },
                attributes: {
                  include: {
                    attributeValue: {
                      include: { attribute: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  private async getPurchasableVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        deletedAt: null,
        isActive: true,
        product: {
          deletedAt: null,
          status: ProductStatus.ACTIVE,
        },
      },
      include: { inventory: true, product: true },
    });

    if (!variant) {
      throw new ResourceNotFoundException('Product variant', variantId);
    }

    return variant;
  }

  private async assertAvailableStock(variantId: string, quantity: number) {
    const variant = await this.getPurchasableVariant(variantId);
    const availableStock =
      (variant.inventory?.stock ?? 0) - (variant.inventory?.reserved ?? 0);

    if (availableStock < quantity) {
      throw new BadRequestException('Not enough stock for this variant');
    }
  }

  private assertCartItemCanCheckout(
    item: NonNullable<
      Awaited<ReturnType<CartsService['getCartById']>>
    >['items'][number],
  ) {
    const variant = item.variant;
    const availableStock =
      (variant.inventory?.stock ?? 0) - (variant.inventory?.reserved ?? 0);

    if (
      variant.deletedAt ||
      !variant.isActive ||
      variant.product.deletedAt ||
      variant.product.status !== ProductStatus.ACTIVE
    ) {
      throw new BadRequestException(
        `Variant ${variant.id} is no longer available`,
      );
    }

    if (availableStock < item.quantity) {
      throw new BadRequestException(
        `Not enough stock for variant ${variant.id}`,
      );
    }
  }

  private mapVariantAttributes(
    attributes: NonNullable<
      Awaited<ReturnType<CartsService['getCartById']>>
    >['items'][number]['variant']['attributes'],
  ) {
    if (!attributes.length) return undefined;

    return attributes.reduce<Record<string, string>>((mapped, item) => {
      mapped[item.attributeValue.attribute.name] = item.attributeValue.value;
      return mapped;
    }, {});
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

  private async findCartItem(cartId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
    });

    if (!item) {
      throw new ResourceNotFoundException('Cart item', itemId);
    }

    return item;
  }
}
