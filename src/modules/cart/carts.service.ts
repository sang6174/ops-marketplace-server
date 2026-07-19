import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@infrastructure/generated/prisma/client';
import {
  CartStatus,
  OrderStatus,
  OrderType,
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
    const product = await this.getProductById(dto.productId);
    await this.assertAvailableStock(dto.productId, dto.quantity);
    const cart = await this.findOrCreateCart(userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      const nextQuantity = existingItem.quantity + dto.quantity;
      await this.assertAvailableStock(dto.productId, nextQuantity);

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
          productId: dto.productId,
          quantity: dto.quantity,
          price: product.retailPrice,
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

    await this.assertAvailableStock(item.productId, dto.quantity);
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

    // Resolve shipping address
    let shippingAddressJson: Record<string, unknown>;

    if (dto.addressId) {
      const address = await this.prisma.address.findFirst({
        where: { id: dto.addressId, userId, deletedAt: null },
      });

      if (!address) {
        throw new ResourceNotFoundException('Address', dto.addressId);
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

      // Group items by shop
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

        // All items in this group share the same seller
        const sellerId = items[0].product.sellerId;

        const order = await tx.order.create({
          data: {
            buyerId: userId,
            sellerId,
            orderType: OrderType.RETAIL,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            totalPrice: totalPrice.toString(),
            shippingAddress: shippingAddressJson as Prisma.InputJsonValue,
            paymentMethod: dto.paymentMethod ?? PaymentMethod.BANK_TRANSFER,
            notes: dto.notes,
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

        // Reserve inventory for each item
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

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: CartStatus.COMPLETED },
      });

      const paymentMethod =
        dto.paymentMethod ?? PaymentMethod.BANK_TRANSFER;
      const paymentAmount = createdOrders.reduce(
        (sum, order) => sum + Number(order.totalPrice),
        0,
      );
      const payment = await tx.payment.create({
        data: {
          userId,
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

  private assertCartItemCanCheckout(
    item: NonNullable<
      Awaited<ReturnType<CartsService['getCartById']>>
    >['items'][number],
  ) {
    const product = item.product;
    const availableStock =
      (product.inventory?.stock ?? 0) - (product.inventory?.reserved ?? 0);

    if (product.deletedAt || product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException(
        `Product ${product.id} is no longer available`,
      );
    }

    if (availableStock < item.quantity) {
      throw new BadRequestException(
        `Not enough stock for product ${product.id}`,
      );
    }
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
