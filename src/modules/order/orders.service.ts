// src/module/order/order.service.ts
import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  CartStatus,
  ProductStatus,
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import { toPrismaPage } from '@common/utils';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdateOrderPaymentStatusDto,
  QueryOrdersDto,
} from './dtos/order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrdersFromCart(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                inventory: true,
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

    // Group cart items by shop
    const grouped = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      this.assertCartItemCanCheckout(item);
      const shopId = item.variant.product.shopId;
      if (!grouped.has(shopId)) {
        grouped.set(shopId, []);
      }
      grouped.get(shopId)!.push(item);
    }

    // Create one order per shop in transaction
    const checkoutResult = await this.prisma.$transaction(async (tx) => {
      const createdOrders = [];

      for (const [shopId, items] of grouped) {
        // Calculate total price
        const totalPrice = items.reduce(
          (sum, item) => sum + Number(item.price) * item.quantity,
          0,
        );

        // Create order
        const order = await tx.order.create({
          data: {
            userId,
            shopId,
            addressId: dto.addressId,
            status: OrderStatus.PENDING,
            totalPrice: totalPrice.toString(),
            paymentStatus: PaymentStatus.PENDING,

            items: {
              create: items.map((item) => ({
                shopId,
                variantId: item.variantId,
                price: item.price,
                quantity: item.quantity,
                productName: item.variant.product.name,
                variantName: item.variant.name,
                sku: item.variant.sku,
              })),
            },
          },
          include: { items: true },
        });

        // Deduct inventory
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

      // Clear cart
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
      message: 'Orders created successfully from cart',
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, deletedAt: null },
      include: {
        items: true,
        address: true,
        shipping: true,
      },
    });

    if (!order) {
      throw new ResourceNotFoundException('Order', orderId);
    }

    return order;
  }

  async getOrderAsShop(userId: string, orderId: string) {
    // Get shop owned by user
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    });

    if (!shop) {
      throw new ForbiddenException('No shop found');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId: shop.id, deletedAt: null },
      include: {
        items: true,
        address: true,
        shipping: true,
      },
    });

    if (!order) {
      throw new ResourceNotFoundException('Order', orderId);
    }

    return order;
  }

  async listOrders(userId: string, dto: QueryOrdersDto) {
    const { page = 1, limit = 20, status, paymentStatus } = dto;

    const where: any = {
      userId,
      deletedAt: null,
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
        include: { items: true, address: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async listShopOrders(userId: string, dto: QueryOrdersDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    });

    if (!shop) {
      throw new ForbiddenException('No shop found');
    }

    const { page = 1, limit = 20, status, paymentStatus } = dto;

    const where: any = {
      shopId: shop.id,
      deletedAt: null,
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
        include: { items: true, address: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async updateOrderStatus(
    userId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    });

    if (!shop) {
      throw new ForbiddenException('No shop found');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId: shop.id, deletedAt: null },
    });

    if (!order) {
      throw new ResourceNotFoundException('Order', orderId);
    }

    const updateData: any = { status: dto.status };

    if (dto.status === OrderStatus.CONFIRMED) {
      updateData.confirmedAt = new Date();
    }
    if (dto.status === OrderStatus.SHIPPING) {
      updateData.shippedAt = new Date();
    }
    if (dto.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: { items: true },
    });
  }

  async updatePaymentStatus(
    userId: string,
    orderId: string,
    dto: UpdateOrderPaymentStatusDto,
  ) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    });

    if (!shop) {
      throw new ForbiddenException('No shop found');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId: shop.id, deletedAt: null },
    });

    if (!order) {
      throw new ResourceNotFoundException('Order', orderId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: dto.paymentStatus,
        },
        include: { items: true },
      });

      await tx.payment.updateMany({
        where: {
          items: { some: { orderId } },
        },
        data: {
          status: dto.paymentStatus,
        },
      });

      return updatedOrder;
    });
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, deletedAt: null },
    });

    if (!order) {
      throw new ResourceNotFoundException('Order', orderId);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Can only cancel orders with PENDING status',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Release reserved inventory
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
      });

      for (const item of orderItems) {
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: {
            reserved: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });
      }

      // Cancel order
      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });
    });
  }

  private assertCartItemCanCheckout(item: {
    quantity: number;
    variantId: string;
    variant: {
      id: string;
      deletedAt: Date | null;
      isActive: boolean;
      inventory: { stock: number; reserved: number } | null;
      product: { deletedAt: Date | null; status: ProductStatus };
    };
  }) {
    const availableStock =
      (item.variant.inventory?.stock ?? 0) -
      (item.variant.inventory?.reserved ?? 0);

    if (
      item.variant.deletedAt ||
      !item.variant.isActive ||
      item.variant.product.deletedAt ||
      item.variant.product.status !== ProductStatus.ACTIVE
    ) {
      throw new BadRequestException(
        `Variant ${item.variantId} is no longer available`,
      );
    }

    if (availableStock < item.quantity) {
      throw new BadRequestException(
        `Not enough stock for variant ${item.variantId}`,
      );
    }
  }
}
