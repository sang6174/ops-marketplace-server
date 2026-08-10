import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CartsService } from './carts.service';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  CART_PRISMA_REPOSITORY,
} from './infrastructure/repositories/cart-prisma.repository';
import { AddItemToCartUseCase } from './applications/use-cases/add-item.usecase';
import { GetCartUseCase } from './applications/use-cases/get-cart.usecase';
import { UpdateCartUseCase } from './applications/use-cases/update-cart.usecase';
import { CheckoutUseCase } from './applications/use-cases/checkout.usecase';
import { ResourceNotFoundException } from '@common/exceptions';
import { AddCartItemDto, CheckoutCartDto, UpdateCartItemDto } from './dtos';
import { CartStatus } from '@infrastructure/generated/prisma/enums';
import type { CartResponse } from './interfaces/dtos/cart.dto';

describe('CartsService', () => {
  let service: CartsService;
  let prisma: jest.Mocked<PrismaService>;
  let addItemUseCase: jest.Mocked<AddItemToCartUseCase>;
  let getCartUseCase: jest.Mocked<GetCartUseCase>;
  let updateCartUseCase: jest.Mocked<UpdateCartUseCase>;
  let checkoutUseCase: jest.Mocked<CheckoutUseCase>;

  const userId = 'user-001';
  const productId = 'product-001';

  const mockCartResponse = {
    id: 'cart-001',
    userId,
    sessionId: null,
    status: CartStatus.ACTIVE,
    items: [
      {
        productId,
        quantity: 2,
        retailPrice: 150000,
        totalPrice: 300000,
        effectivePrice: 150000,
        product: {
          id: productId,
          name: 'Test Product',
          retailPrice: '150000',
          images: [{ url: 'https://img.example/1.jpg', isPrimary: true, sortOrder: 0 }],
          inventory: { stock: 100, reserved: 0 },
          shop: { id: 'shop-001', name: 'Test Shop' },
        },
      },
    ],
    totalPrice: 300000,
    totalQuantity: 2,
    isEmpty: false,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-02'),
  } as unknown as CartResponse;

  const mockEmptyCartResponse = {
    id: 'cart-002',
    userId,
    sessionId: null,
    status: CartStatus.ACTIVE,
    items: [],
    totalPrice: 0,
    totalQuantity: 0,
    isEmpty: true,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
  } as unknown as CartResponse;

  const mockPrismaCartWithItems = {
    id: 'cart-001',
    userId,
    status: CartStatus.ACTIVE,
    items: [
      {
        id: 'item-001',
        productId,
        quantity: 2,
        price: '150000',
        createdAt: new Date('2025-06-01'),
        product: {
          id: productId,
          name: 'Test Product',
          retailPrice: '150000',
          inventory: { stock: 100, reserved: 0 },
          images: [{ url: 'https://img.example/1.jpg', isPrimary: true, sortOrder: 0 }],
          shop: { id: 'shop-001', name: 'Test Shop' },
        },
      },
    ],
  };

  const mockPrismaEmptyCart = {
    id: 'cart-002',
    userId,
    status: CartStatus.ACTIVE,
    items: [],
  };

  beforeEach(async () => {
    const mockPrisma = {
      cart: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      cartItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockCartRepo = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByUserId: jest.fn(),
      findBySessionId: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteBySessionId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CART_PRISMA_REPOSITORY, useValue: mockCartRepo },
        { provide: AddItemToCartUseCase, useValue: { execute: jest.fn() } },
        { provide: GetCartUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateCartUseCase, useValue: { execute: jest.fn() } },
        { provide: CheckoutUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    service = module.get<CartsService>(CartsService);
    prisma = module.get(PrismaService);
    addItemUseCase = module.get(AddItemToCartUseCase);
    getCartUseCase = module.get(GetCartUseCase);
    updateCartUseCase = module.get(UpdateCartUseCase);
    checkoutUseCase = module.get(CheckoutUseCase);
  });

  describe('getCart', () => {
    it('should return cart with items', async () => {
      getCartUseCase.execute.mockResolvedValue(mockCartResponse as any);

      const result = await service.getCart(userId);

      expect(result).toEqual(mockCartResponse);
      expect(getCartUseCase.execute).toHaveBeenCalledWith({ userId });
    });

    it('should return empty cart for new user', async () => {
      getCartUseCase.execute.mockResolvedValue(mockEmptyCartResponse as any);

      const result = await service.getCart('new-user');

      expect(result).toEqual(mockEmptyCartResponse);
      expect(getCartUseCase.execute).toHaveBeenCalledWith({ userId: 'new-user' });
    });

    it('should propagate not found error from use case', async () => {
      getCartUseCase.execute.mockRejectedValue(
        new ResourceNotFoundException('Cart', 'user-unknown'),
      );

      await expect(service.getCart('user-unknown')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('addItem', () => {
    const dto: AddCartItemDto = { productId, quantity: 1 };

    it('should add a new item to cart', async () => {
      addItemUseCase.execute.mockResolvedValue(mockCartResponse as any);

      const result = await service.addItem(userId, dto);

      expect(result).toEqual(mockCartResponse);
      expect(addItemUseCase.execute).toHaveBeenCalledWith({
        userId,
        productId: dto.productId,
        quantity: dto.quantity,
      } as any);
    });

    it('should update quantity when adding existing item', async () => {
      const updatedCart = {
        ...mockCartResponse,
        items: [{ ...mockCartResponse.items[0], quantity: 5 }],
        totalQuantity: 5,
        totalPrice: 750000,
      };
      addItemUseCase.execute.mockResolvedValue(updatedCart as any);

      const result = await service.addItem(userId, { productId, quantity: 3 });

      expect(result.items[0].quantity).toBe(5);
      expect(addItemUseCase.execute).toHaveBeenCalledWith({
        userId,
        productId,
        quantity: 3,
      } as any);
    });

    it('should propagate error when product not found', async () => {
      addItemUseCase.execute.mockRejectedValue(
        new ResourceNotFoundException('Product', 'invalid-product'),
      );

      await expect(
        service.addItem(userId, { productId: 'invalid-product', quantity: 1 }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('updateItem', () => {
    it('should update item quantity successfully', async () => {
      const dto: UpdateCartItemDto = { quantity: 5 };
      const updatedCart = {
        ...mockCartResponse,
        items: [{ ...mockCartResponse.items[0], quantity: 5 }],
        totalQuantity: 5,
      };
      updateCartUseCase.execute.mockResolvedValue(updatedCart as any);

      const result = await service.updateItem(userId, productId, dto);

      expect(result).toEqual(updatedCart);
      expect(updateCartUseCase.execute).toHaveBeenCalledWith({
        userId,
        productId,
        quantity: 5,
      });
    });

    it('should propagate error when item is not in cart', async () => {
      updateCartUseCase.execute.mockRejectedValue(
        new ResourceNotFoundException('Cart item', 'missing-product'),
      );

      await expect(
        service.updateItem(userId, 'missing-product', { quantity: 2 }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart successfully', async () => {
      updateCartUseCase.execute.mockResolvedValue(mockEmptyCartResponse as any);

      const result = await service.removeItem(userId, productId);

      expect(result).toEqual(mockEmptyCartResponse);
      expect(updateCartUseCase.execute).toHaveBeenCalledWith({
        userId,
        productId,
      });
    });

    it('should propagate error when item is not in cart', async () => {
      updateCartUseCase.execute.mockRejectedValue(
        new ResourceNotFoundException('Cart item', 'missing-product'),
      );

      await expect(
        service.removeItem(userId, 'missing-product'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', async () => {
      updateCartUseCase.execute.mockResolvedValue(mockEmptyCartResponse as any);

      const result = await service.clearCart(userId);

      expect(result).toEqual(mockEmptyCartResponse);
      expect(updateCartUseCase.execute).toHaveBeenCalledWith({ userId });
    });

    it('should propagate error when cart not found', async () => {
      updateCartUseCase.execute.mockRejectedValue(
        new ResourceNotFoundException('Cart', 'user unknown-user'),
      );

      await expect(service.clearCart('unknown-user')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('checkout', () => {
    it('should delegate to checkout use case with address and payment', async () => {
      const dto: CheckoutCartDto = {
        addressId: 'addr-001',
        paymentMethod: 'BANK_TRANSFER',
      };
      const mockCheckoutResult = {
        orders: [{ id: 'order-001', buyerId: userId, totalPrice: '300000' }],
        payment: { id: 'pay-001', amount: '300000', status: 'PENDING' },
        message: 'Checkout completed successfully',
      };
      checkoutUseCase.execute.mockResolvedValue(mockCheckoutResult as any);

      const result = await service.checkout(userId, dto);

      expect(result).toEqual(mockCheckoutResult);
      expect(checkoutUseCase.execute).toHaveBeenCalledWith({
        userId,
        cartId: '',
        shippingAddressId: dto.addressId,
        paymentMethod: dto.paymentMethod,
      } as any);
    });

    it('should delegate with empty strings when dto fields missing', async () => {
      const dto: CheckoutCartDto = {};
      const mockCheckoutResult = { orders: [], payment: {}, message: 'ok' };
      checkoutUseCase.execute.mockResolvedValue(mockCheckoutResult as any);

      const result = await service.checkout(userId, dto);

      expect(result).toEqual(mockCheckoutResult);
      expect(checkoutUseCase.execute).toHaveBeenCalledWith({
        userId,
        cartId: '',
        shippingAddressId: '',
        paymentMethod: '',
      } as any);
    });

    it('should propagate empty cart error from use case', async () => {
      checkoutUseCase.execute.mockRejectedValue(
        new BadRequestException('Cart is empty'),
      );

      await expect(
        service.checkout(userId, { addressId: 'addr-001' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSummary', () => {
    it('should return correct summary for cart with items', async () => {
      prisma.cart.findFirst.mockResolvedValue({ id: 'cart-001', userId, status: CartStatus.ACTIVE } as any);
      prisma.cart.findUnique.mockResolvedValue(mockPrismaCartWithItems as any);

      const summary = await service.getSummary(userId);

      expect(summary).toEqual({
        cartId: 'cart-001',
        itemCount: 1,
        totalQuantity: 2,
        subtotal: '300000',
        discount: '0',
        total: '300000',
      });
    });

    it('should create cart and return empty summary when no cart exists', async () => {
      prisma.cart.findFirst.mockResolvedValueOnce(null);
      prisma.cart.create.mockResolvedValueOnce({ id: 'cart-new', userId: 'new-user', status: CartStatus.ACTIVE } as any);
      prisma.cart.findUnique.mockResolvedValueOnce(mockPrismaEmptyCart as any);

      const summary = await service.getSummary('new-user');

      expect(prisma.cart.create).toHaveBeenCalledWith({
        data: { userId: 'new-user', status: CartStatus.ACTIVE },
      });
      expect(summary).toEqual({
        cartId: 'cart-002',
        itemCount: 0,
        totalQuantity: 0,
        subtotal: '0',
        discount: '0',
        total: '0',
      });
    });

    it('should throw if cart not found after creation', async () => {
      prisma.cart.findFirst.mockResolvedValue({ id: 'cart-ghost', userId, status: CartStatus.ACTIVE } as any);
      prisma.cart.findUnique.mockResolvedValue(null as any);

      await expect(service.getSummary(userId)).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('applyCoupon', () => {
    it('should throw when coupon storage is not configured', async () => {
      prisma.cart.findFirst.mockResolvedValue({ id: 'cart-001', userId, status: CartStatus.ACTIVE } as any);

      await expect(
        service.applyCoupon(userId, { code: 'SAVE10' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when no active cart exists', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      await expect(
        service.applyCoupon(userId, { code: 'SAVE10' }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('removeCoupon', () => {
    it('should return message that no coupon is stored', async () => {
      prisma.cart.findFirst.mockResolvedValue({ id: 'cart-001', userId, status: CartStatus.ACTIVE } as any);
      prisma.cart.findUnique.mockResolvedValue(mockPrismaCartWithItems as any);

      const result = await service.removeCoupon(userId);

      expect(result.message).toBe('No coupon is currently stored on cart');
      expect(result.summary).toBeDefined();
      expect(result.summary.cartId).toBe('cart-001');
    });

    it('should throw when no active cart exists', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      await expect(service.removeCoupon(userId)).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
