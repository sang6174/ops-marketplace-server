import {
  Inject,
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
import { NestEventBus } from '@infrastructure/event-bus';
import {
  OrderCreated,
  OrderShipped,
  OrderDelivered,
  OrderCancelled,
} from '@domain/events/OrderEvents';
import { OrderId } from '@domain/value-objects/OrderId';
import { BuyerId } from '@domain/value-objects/BuyerId';
import { SellerId } from '@domain/value-objects/SellerId';
import { Money } from '@domain/value-objects/Money';
import {
  ORDER_PRISMA_REPOSITORY,
} from './infrastructure/repositories/order-prisma.repository';
import { IOrderRepository } from '@domain/repository-contracts/order-repository.contract';
import { ResourceNotFoundException } from '@common/exceptions';
import { paginate } from '@common/dtos/pagination.dto';
import { toPrismaPage } from '@common/utils';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdateOrderPaymentStatusDto,
  QueryOrdersDto,
} from './dtos/order.dto';
import {
  CancelOrderUseCase,
  UpdateOrderStatusUseCase,
  UpdatePaymentStatusUseCase,
} from './applications/use-cases';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: NestEventBus,
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private readonly updatePaymentStatusUseCase: UpdatePaymentStatusUseCase,
  ) {}

  async createOrdersFromCart(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: {
        items: {
          include: {
            product: {
              include: {
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

    const grouped = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      this.assertCartItemCanCheckout(item);
      const shopId = item.product.shopId;
      if (!grouped.has(shopId)) {
        grouped.set(shopId, []);
      }
      grouped.get(shopId)!.push(item);
    }

    const checkoutResult = await this.prisma.$transaction(async (tx) => {
      const createdOrders = [];

      for (const [shopId, items] of grouped) {
        const totalPrice = items.reduce(
          (sum, item) => sum + Number(item.price) * item.quantity,
          0,
        );

        const order = await tx.order.create({
          data: {
            buyerId: userId,
            sellerId: items[0].product.sellerId,
            shippingAddress: {
              id: address.id,
              country: address.country,
              city: address.city,
              district: address.district,
              ward: address.ward,
              street: address.street,
              detail: address.detail,
              postalCode: address.postalCode,
            },
            status: OrderStatus.PENDING,
            totalPrice,
            paymentStatus: PaymentStatus.PENDING,
            paymentMethod: dto.paymentMethod ?? PaymentMethod.BANK_TRANSFER,
            items: {
              create: items.map((item) => ({
                shopId,
                productId: item.productId,
                price: item.price,
                quantity: item.quantity,
                productName: item.product.name,
                productImage: null,
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

      const paymentMethod = dto.paymentMethod ?? PaymentMethod.BANK_TRANSFER;
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

    for (const order of checkoutResult.orders) {
      await this.eventBus.publish(
        new OrderCreated(
          OrderId.create(order.id),
          BuyerId.create(order.buyerId),
          SellerId.create(order.sellerId),
          Money.fromDecimal(Number(order.totalPrice)),
          order.createdAt,
        ),
      );
    }

    return {
      ...checkoutResult,
      message: 'Orders created successfully from cart',
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: userId, deletedAt: null },
      include: { items: true },
    });

    if (!order) {
      throw new ResourceNotFoundException('Order', orderId);
    }

    return order;
  }

  async getOrderAsShop(userId: string, orderId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    });

    if (!shop) {
      throw new ForbiddenException('No shop found');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, items: { some: { shopId: shop.id } }, deletedAt: null },
      include: { items: true },
    });

    if (!order) {
      throw new ResourceNotFoundException('Order', orderId);
    }

    return order;
  }

  async listOrders(userId: string, dto: QueryOrdersDto) {
    const { page = 1, limit = 20, status, paymentStatus } = dto;

    const where: any = {
      buyerId: userId,
      deletedAt: null,
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
        include: { items: true },
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
      items: { some: { shopId: shop.id } },
      deletedAt: null,
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
        include: { items: true },
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
      where: { id: orderId, items: { some: { shopId: shop.id } }, deletedAt: null },
    });

    if (!order) {
      throw new ResourceNotFoundException('Order', orderId);
    }

    return this.updateOrderStatusUseCase.execute({
      orderId,
      status: dto.status as any,
      userId,
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
      where: { id: orderId, items: { some: { shopId: shop.id } }, deletedAt: null },
    });

    if (!order) {
      throw new ResourceNotFoundException('Order', orderId);
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await this.updatePaymentStatusUseCase.execute({
        orderId,
        paymentStatus: dto.paymentStatus as any,
      });

      await tx.payment.updateMany({
        where: {
          items: { some: { orderId } },
        },
        data: {
          status: dto.paymentStatus as any,
        },
      });

      return result;
    });
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: userId, deletedAt: null },
    });

    if (!order) {
      throw new ResourceNotFoundException('Order', orderId);
    }

    if (order.status !== (OrderStatus.PENDING as any)) {
      throw new BadRequestException(
        'Can only cancel orders with PENDING status',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
      });

      for (const item of orderItems) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reserved: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });
      }
    });

    return this.cancelOrderUseCase.execute({
      orderId,
      userId,
    });
  }

  private assertCartItemCanCheckout(item: {
    quantity: number;
    productId: string;
    product: {
      id: string;
      deletedAt: Date | null;
      status: ProductStatus;
      inventory: { stock: number; reserved: number } | null;
    };
  }) {
    const availableStock =
      (item.product.inventory?.stock ?? 0) -
      (item.product.inventory?.reserved ?? 0);

    if (
      item.product.deletedAt ||
      item.product.status !== ProductStatus.ACTIVE
    ) {
      throw new BadRequestException(
        `Product ${item.productId} is no longer available`,
      );
    }

    if (availableStock < item.quantity) {
      throw new BadRequestException(
        `Not enough stock for product ${item.productId}`,
      );
    }
  }
}
