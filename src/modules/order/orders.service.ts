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
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  ResourceNotFoundException,
  NotShopOwnerException,
} from '@common/exceptions';
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
            variant: { include: { product: true, inventory: true } },
          },
        },
      },
    });

    if (!cart || !cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });

    if (!address) {
      throw new ResourceNotFoundException('Address', dto.addressId);
    }

    // Group cart items by shop
    const grouped = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const shopId = item.variant.product.shopId;
      if (!grouped.has(shopId)) {
        grouped.set(shopId, []);
      }
      grouped.get(shopId)!.push(item);
    }

    // Create one order per shop in transaction
    const orders = await this.prisma.$transaction(async (tx) => {
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

      return createdOrders;
    });

    return { orders, message: 'Orders created successfully from cart' };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
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
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!shop) {
      throw new ForbiddenException('No shop found');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId: shop.id },
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
      isDeleted: false,
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
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!shop) {
      throw new ForbiddenException('No shop found');
    }

    const { page = 1, limit = 20, status, paymentStatus } = dto;

    const where: any = {
      shopId: shop.id,
      isDeleted: false,
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
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!shop) {
      throw new ForbiddenException('No shop found');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId: shop.id },
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

  async updatePaymentStatus(orderId: string, dto: UpdateOrderPaymentStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new ResourceNotFoundException('Order', orderId);
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: dto.paymentStatus,
      },
      include: { items: true },
    });
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
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
}
