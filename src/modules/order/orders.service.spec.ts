jest.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
}));

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
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
import { ORDER_PRISMA_REPOSITORY } from './infrastructure/repositories/order-prisma.repository';
import { OrdersService } from './orders.service';
import {
  CancelOrderUseCase,
  UpdateOrderStatusUseCase,
  UpdatePaymentStatusUseCase,
} from './applications/use-cases';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  CreateOrderDto,
  QueryOrdersDto,
  UpdateOrderStatusDto,
  UpdateOrderPaymentStatusDto,
} from './dtos/order.dto';

// ---- factory helpers ----

const makeOrderRecord = (overrides?: Record<string, any>) => ({
  id: 'order-1',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  status: OrderStatus.PENDING,
  totalPrice: '500000',
  paymentStatus: PaymentStatus.PENDING,
  paymentMethod: PaymentMethod.BANK_TRANSFER,
  shippingAddress: {
    id: 'addr-1',
    country: 'Vietnam',
    city: 'Ho Chi Minh',
    district: 'District 1',
    ward: 'Ward 1',
    street: '123 Main St',
    detail: 'Apt 4B',
    postalCode: '70000',
  },
  items: [
    {
      id: 'item-1',
      orderId: 'order-1',
      shopId: 'shop-1',
      productId: 'prod-1',
      productName: 'Product A',
      price: '200000',
      quantity: 2,
      productImage: null,
    },
  ],
  createdAt: new Date('2025-06-01T00:00:00.000Z'),
  updatedAt: new Date('2025-06-01T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

const makeCartItemProduct = (overrides?: Record<string, any>): any => ({
  id: 'prod-1',
  shopId: 'shop-1',
  sellerId: 'seller-1',
  name: 'Product A',
  status: ProductStatus.ACTIVE,
  deletedAt: null,
  inventory: {
    id: 'inv-1',
    productId: 'prod-1',
    stock: 100,
    reserved: 5,
  },
  ...overrides,
});

const makeCartItem = (overrides?: Record<string, any>): any => ({
  id: 'cart-item-1',
  cartId: 'cart-1',
  productId: 'prod-1',
  shopId: 'shop-1',
  price: '200000',
  quantity: 2,
  product: makeCartItemProduct(),
  ...overrides,
});

const makeCartRecord = (overrides?: Record<string, any>): any => ({
  id: 'cart-1',
  userId: 'buyer-1',
  status: CartStatus.ACTIVE,
  items: [makeCartItem()],
  ...overrides,
});

const makeAddressRecord = (overrides?: Record<string, any>): any => ({
  id: 'addr-1',
  userId: 'buyer-1',
  country: 'Vietnam',
  city: 'Ho Chi Minh',
  district: 'District 1',
  ward: 'Ward 1',
  street: '123 Main St',
  detail: 'Apt 4B',
  postalCode: '70000',
  deletedAt: null,
  ...overrides,
});

const makeShopRecord = (overrides?: Record<string, any>): any => ({
  id: 'shop-1',
  ownerId: 'seller-1',
  deletedAt: null,
  ...overrides,
});

const makeTxMock = (): any => ({
  order: { create: jest.fn() },
  inventory: { update: jest.fn() },
  cartItem: { deleteMany: jest.fn() },
  cart: { update: jest.fn() },
  payment: { create: jest.fn(), updateMany: jest.fn() },
  orderItem: { findMany: jest.fn() },
});

// ---- test suite ----

describe('OrdersService', () => {
  let service: OrdersService;

  let txMock: ReturnType<typeof makeTxMock>;

  let prismaMock: any;
  let eventBusMock: any;
  let cancelOrderUseCaseMock: any;
  let updateOrderStatusUseCaseMock: any;
  let updatePaymentStatusUseCaseMock: any;

  beforeEach(async () => {
    txMock = makeTxMock();

    prismaMock = {
      cart: { findFirst: jest.fn() },
      address: { findFirst: jest.fn() },
      shop: { findFirst: jest.fn() },
      order: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      cartItem: { deleteMany: jest.fn() },
      inventory: { update: jest.fn() },
      payment: { create: jest.fn(), updateMany: jest.fn() },
      orderItem: { findMany: jest.fn() },
      $transaction: jest
        .fn()
        .mockImplementation((arg: any) =>
          Array.isArray(arg) ? Promise.all(arg) : arg(txMock),
        ),
    };

    eventBusMock = { publish: jest.fn() };
    cancelOrderUseCaseMock = { execute: jest.fn() };
    updateOrderStatusUseCaseMock = { execute: jest.fn() };
    updatePaymentStatusUseCaseMock = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NestEventBus, useValue: eventBusMock },
        { provide: ORDER_PRISMA_REPOSITORY, useValue: {} },
        { provide: CancelOrderUseCase, useValue: cancelOrderUseCaseMock },
        { provide: UpdateOrderStatusUseCase, useValue: updateOrderStatusUseCaseMock },
        {
          provide: UpdatePaymentStatusUseCase,
          useValue: updatePaymentStatusUseCaseMock,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  // =====================================================================
  // createOrdersFromCart
  // =====================================================================
  describe('createOrdersFromCart', () => {
    const userId = 'buyer-1';
    const dto: CreateOrderDto = {
      addressId: 'addr-1',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    };

    it('should create orders from cart successfully', async () => {
      const cart = makeCartRecord();
      const address = makeAddressRecord();
      const order = makeOrderRecord();

      prismaMock.cart.findFirst.mockResolvedValue(cart);
      prismaMock.address.findFirst.mockResolvedValue(address);
      txMock.order.create.mockResolvedValue(order);
      txMock.cartItem.deleteMany.mockResolvedValue({ count: 1 });
      txMock.cart.update.mockResolvedValue({
        ...cart,
        status: CartStatus.COMPLETED,
      });
      txMock.payment.create.mockResolvedValue({
        id: 'pay-1',
        userId,
        amount: '500000',
        status: PaymentStatus.PENDING,
        method: PaymentMethod.BANK_TRANSFER,
        items: [{ id: 'pay-item-1', orderId: 'order-1', amount: '500000' }],
      });

      const result = await service.createOrdersFromCart(userId, dto);

      expect(prismaMock.cart.findFirst).toHaveBeenCalledWith({
        where: { userId, status: CartStatus.ACTIVE },
        include: {
          items: {
            include: { product: { include: { inventory: true } } },
          },
        },
      });
      expect(prismaMock.address.findFirst).toHaveBeenCalledWith({
        where: { id: 'addr-1', userId, deletedAt: null },
      });
      expect(txMock.order.create).toHaveBeenCalledTimes(1);
      expect(txMock.inventory.update).toHaveBeenCalledTimes(1);
      expect(txMock.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
      expect(txMock.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { status: CartStatus.COMPLETED },
      });
      expect(txMock.payment.create).toHaveBeenCalledTimes(1);
      expect(eventBusMock.publish).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('payment');
      expect(result).toHaveProperty(
        'message',
        'Orders created successfully from cart',
      );
    });

    it('should throw BadRequestException when cart is null', async () => {
      prismaMock.cart.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrdersFromCart(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when cart has no items', async () => {
      prismaMock.cart.findFirst.mockResolvedValue({
        ...makeCartRecord(),
        items: [],
      });

      await expect(
        service.createOrdersFromCart(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ResourceNotFoundException when address not found', async () => {
      prismaMock.cart.findFirst.mockResolvedValue(makeCartRecord());
      prismaMock.address.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrdersFromCart(userId, dto),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should throw BadRequestException when product is deleted', async () => {
      const cart = makeCartRecord();
      cart.items[0].product.deletedAt = new Date();
      prismaMock.cart.findFirst.mockResolvedValue(cart);
      prismaMock.address.findFirst.mockResolvedValue(makeAddressRecord());

      await expect(
        service.createOrdersFromCart(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when product status is not ACTIVE', async () => {
      const cart = makeCartRecord();
      cart.items[0].product.status = ProductStatus.DRAFT;
      prismaMock.cart.findFirst.mockResolvedValue(cart);
      prismaMock.address.findFirst.mockResolvedValue(makeAddressRecord());

      await expect(
        service.createOrdersFromCart(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      const cart = makeCartRecord();
      cart.items[0].product.inventory.stock = 2;
      cart.items[0].product.inventory.reserved = 0;
      cart.items[0].quantity = 5;
      prismaMock.cart.findFirst.mockResolvedValue(cart);
      prismaMock.address.findFirst.mockResolvedValue(makeAddressRecord());

      await expect(
        service.createOrdersFromCart(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create multiple orders when items span multiple shops', async () => {
      const cart = makeCartRecord();
      cart.items.push(
        makeCartItem({
          id: 'cart-item-2',
          productId: 'prod-2',
          shopId: 'shop-2',
          price: '100000',
          quantity: 1,
          product: makeCartItemProduct({
            id: 'prod-2',
            shopId: 'shop-2',
            sellerId: 'seller-2',
            name: 'Product B',
            inventory: {
              id: 'inv-2',
              productId: 'prod-2',
              stock: 50,
              reserved: 0,
            },
          }),
        }),
      );
      prismaMock.cart.findFirst.mockResolvedValue(cart);
      prismaMock.address.findFirst.mockResolvedValue(makeAddressRecord());

      txMock.order.create
        .mockResolvedValueOnce(makeOrderRecord({ id: 'order-1' }))
        .mockResolvedValueOnce(
          makeOrderRecord({ id: 'order-2', sellerId: 'seller-2' }),
        );
      txMock.cartItem.deleteMany.mockResolvedValue({ count: 2 });
      txMock.cart.update.mockResolvedValue({
        ...cart,
        status: CartStatus.COMPLETED,
      });
      txMock.payment.create.mockResolvedValue({
        id: 'pay-1',
        userId,
        amount: '600000',
        status: PaymentStatus.PENDING,
        method: PaymentMethod.BANK_TRANSFER,
        items: [],
      });

      const result = await service.createOrdersFromCart(userId, dto);

      expect(txMock.order.create).toHaveBeenCalledTimes(2);
      expect(txMock.inventory.update).toHaveBeenCalledTimes(2);
      expect(eventBusMock.publish).toHaveBeenCalledTimes(2);
      expect(result.orders).toHaveLength(2);
    });
  });

  // =====================================================================
  // getOrder
  // =====================================================================
  describe('getOrder', () => {
    const userId = 'buyer-1';
    const orderId = 'order-1';

    it('should return an order', async () => {
      prismaMock.order.findFirst.mockResolvedValue(makeOrderRecord());

      const result = await service.getOrder(userId, orderId);

      expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
        where: { id: orderId, buyerId: userId, deletedAt: null },
        include: { items: true },
      });
      expect(result).toHaveProperty('id', 'order-1');
    });

    it('should throw ResourceNotFoundException when order not found', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(service.getOrder(userId, orderId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should throw ResourceNotFoundException for wrong buyer', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrder('other-buyer', orderId),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  // =====================================================================
  // getOrderAsShop
  // =====================================================================
  describe('getOrderAsShop', () => {
    const userId = 'seller-1';
    const orderId = 'order-1';

    it('should return order for the shop', async () => {
      prismaMock.shop.findFirst.mockResolvedValue(makeShopRecord());
      prismaMock.order.findFirst.mockResolvedValue(makeOrderRecord());

      const result = await service.getOrderAsShop(userId, orderId);

      expect(prismaMock.shop.findFirst).toHaveBeenCalledWith({
        where: { ownerId: userId, deletedAt: null },
        select: { id: true },
      });
      expect(result).toHaveProperty('id', 'order-1');
    });

    it('should throw ForbiddenException when no shop found', async () => {
      prismaMock.shop.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrderAsShop(userId, orderId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ResourceNotFoundException when order not found for shop', async () => {
      prismaMock.shop.findFirst.mockResolvedValue(makeShopRecord());
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrderAsShop(userId, orderId),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  // =====================================================================
  // listOrders
  // =====================================================================
  describe('listOrders', () => {
    const userId = 'buyer-1';

    it('should return paginated list of orders', async () => {
      const orders = [makeOrderRecord()];
      prismaMock.order.findMany.mockResolvedValue(orders);
      prismaMock.order.count.mockResolvedValue(1);

      const result = await service.listOrders(userId, {});

      expect(result).toHaveProperty('items', orders);
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
    });

    it('should filter by status', async () => {
      const dto: QueryOrdersDto = { status: OrderStatus.PENDING };
      prismaMock.order.findMany.mockResolvedValue([]);
      prismaMock.order.count.mockResolvedValue(0);

      await service.listOrders(userId, dto);

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: OrderStatus.PENDING }),
        }),
      );
    });

    it('should filter by paymentStatus', async () => {
      const dto: QueryOrdersDto = { paymentStatus: PaymentStatus.SUCCEEDED };
      prismaMock.order.findMany.mockResolvedValue([]);
      prismaMock.order.count.mockResolvedValue(0);

      await service.listOrders(userId, dto);

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            paymentStatus: PaymentStatus.SUCCEEDED,
          }),
        }),
      );
    });

    it('should filter by both status and paymentStatus', async () => {
      const dto: QueryOrdersDto = {
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      };
      prismaMock.order.findMany.mockResolvedValue([]);
      prismaMock.order.count.mockResolvedValue(0);

      await service.listOrders(userId, dto);

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            buyerId: userId,
            deletedAt: null,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
          },
        }),
      );
    });

    it('should return empty list when no orders exist', async () => {
      prismaMock.order.findMany.mockResolvedValue([]);
      prismaMock.order.count.mockResolvedValue(0);

      const result = await service.listOrders(userId, {});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // =====================================================================
  // listShopOrders
  // =====================================================================
  describe('listShopOrders', () => {
    const userId = 'seller-1';

    it('should return paginated list of shop orders', async () => {
      prismaMock.shop.findFirst.mockResolvedValue(makeShopRecord());
      prismaMock.order.findMany.mockResolvedValue([makeOrderRecord()]);
      prismaMock.order.count.mockResolvedValue(1);

      const result = await service.listShopOrders(userId, {});

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total', 1);
    });

    it('should throw ForbiddenException when shop not found', async () => {
      prismaMock.shop.findFirst.mockResolvedValue(null);

      await expect(service.listShopOrders(userId, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should filter by status and paymentStatus', async () => {
      const dto: QueryOrdersDto = {
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      };
      prismaMock.shop.findFirst.mockResolvedValue(makeShopRecord());
      prismaMock.order.findMany.mockResolvedValue([]);
      prismaMock.order.count.mockResolvedValue(0);

      await service.listShopOrders(userId, dto);

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            items: { some: { shopId: 'shop-1' } },
            deletedAt: null,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
          },
        }),
      );
    });
  });

  // =====================================================================
  // updateOrderStatus
  // =====================================================================
  describe('updateOrderStatus', () => {
    const userId = 'seller-1';
    const orderId = 'order-1';
    const dto: UpdateOrderStatusDto = { status: OrderStatus.SHIPPED };

    it('should delegate to UpdateOrderStatusUseCase', async () => {
      prismaMock.shop.findFirst.mockResolvedValue(makeShopRecord());
      prismaMock.order.findFirst.mockResolvedValue(makeOrderRecord());
      updateOrderStatusUseCaseMock.execute.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.SHIPPED,
      });

      const result = await service.updateOrderStatus(userId, orderId, dto);

      expect(updateOrderStatusUseCaseMock.execute).toHaveBeenCalledWith({
        orderId,
        status: OrderStatus.SHIPPED,
        userId,
      });
      expect(result).toHaveProperty('status', OrderStatus.SHIPPED);
    });

    it('should throw ForbiddenException when shop not found', async () => {
      prismaMock.shop.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus(userId, orderId, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ResourceNotFoundException when order not found', async () => {
      prismaMock.shop.findFirst.mockResolvedValue(makeShopRecord());
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus(userId, orderId, dto),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  // =====================================================================
  // updatePaymentStatus
  // =====================================================================
  describe('updatePaymentStatus', () => {
    const userId = 'seller-1';
    const orderId = 'order-1';
    const dto: UpdateOrderPaymentStatusDto = {
      paymentStatus: PaymentStatus.SUCCEEDED,
    };

    it('should delegate to UpdatePaymentStatusUseCase and update payment', async () => {
      prismaMock.shop.findFirst.mockResolvedValue(makeShopRecord());
      prismaMock.order.findFirst.mockResolvedValue(makeOrderRecord());
      updatePaymentStatusUseCaseMock.execute.mockResolvedValue({
        id: 'order-1',
        paymentStatus: PaymentStatus.SUCCEEDED,
      });
      txMock.payment.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.updatePaymentStatus(userId, orderId, dto);

      expect(updatePaymentStatusUseCaseMock.execute).toHaveBeenCalledWith({
        orderId,
        paymentStatus: PaymentStatus.SUCCEEDED,
      });
      expect(txMock.payment.updateMany).toHaveBeenCalledWith({
        where: { items: { some: { orderId } } },
        data: { status: PaymentStatus.SUCCEEDED },
      });
      expect(result).toHaveProperty('paymentStatus', PaymentStatus.SUCCEEDED);
    });

    it('should throw ForbiddenException when shop not found', async () => {
      prismaMock.shop.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePaymentStatus(userId, orderId, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ResourceNotFoundException when order not found', async () => {
      prismaMock.shop.findFirst.mockResolvedValue(makeShopRecord());
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePaymentStatus(userId, orderId, dto),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  // =====================================================================
  // cancelOrder
  // =====================================================================
  describe('cancelOrder', () => {
    const userId = 'buyer-1';
    const orderId = 'order-1';

    it('should release inventory and delegate to CancelOrderUseCase', async () => {
      prismaMock.order.findFirst.mockResolvedValue(
        makeOrderRecord({ status: OrderStatus.PENDING }),
      );
      txMock.orderItem.findMany.mockResolvedValue([
        { id: 'item-1', orderId: 'order-1', productId: 'prod-1', quantity: 2 },
      ]);
      cancelOrderUseCaseMock.execute.mockResolvedValue({
        id: 'order-1',
        orderStatus: 'CANCELLED',
      });

      const result = await service.cancelOrder(userId, orderId);

      expect(txMock.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        data: { reserved: { decrement: 2 }, version: { increment: 1 } },
      });
      expect(cancelOrderUseCaseMock.execute).toHaveBeenCalledWith({
        orderId,
        userId,
      });
      expect(result).toHaveProperty('orderStatus', 'CANCELLED');
    });

    it('should throw ResourceNotFoundException when order not found', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(service.cancelOrder(userId, orderId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should throw BadRequestException when status is not PENDING', async () => {
      prismaMock.order.findFirst.mockResolvedValue(
        makeOrderRecord({ status: OrderStatus.SHIPPED }),
      );

      await expect(service.cancelOrder(userId, orderId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ResourceNotFoundException for different buyer', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelOrder('other-buyer', orderId),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
