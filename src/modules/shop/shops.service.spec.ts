import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ShopsService } from './shops.service';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  SHOP_PRISMA_REPOSITORY,
} from './infrastructure/repositories/shop-prisma.repository';
import { CreateShopUseCase } from './applications/use-cases/create-shop.usecase';
import { GetShopUseCase } from './applications/use-cases/get-shop.usecase';
import { UpdateShopUseCase } from './applications/use-cases/update-shop.usecase';
import {
  ResourceNotFoundException,
  ShopAlreadyExistsException,
  NotShopOwnerException,
} from '@common/exceptions';
import { CreateShopDto, UpdateShopDto, QueryShopsDto, QueryShopProductsDto } from './dtos/shop.dto';
import { ProductStatus } from '@infrastructure/generated/prisma/enums';
import type { ShopResponse } from './interfaces/dtos/shop.dto';

describe('ShopsService', () => {
  let service: ShopsService;
  let prisma: jest.Mocked<PrismaService>;
  let createShopUseCase: jest.Mocked<CreateShopUseCase>;
  let getShopUseCase: jest.Mocked<GetShopUseCase>;
  let updateShopUseCase: jest.Mocked<UpdateShopUseCase>;

  const ownerId = 'owner-001';
  const shopId = 'shop-001';

  const makeShop = (overrides: Partial<ShopResponse> = {}): ShopResponse =>
    ({
      id: shopId,
      ownerId,
      name: 'Fresh Farm Market',
      description: 'We sell the freshest produce',
      logo: null,
      coverImage: null,
      phone: null,
      email: null,
      address: null,
      status: 'ACTIVE',
      createdAt: new Date('2025-03-15'),
      updatedAt: new Date('2025-06-01'),
      deletedAt: null,
      owner: { id: ownerId, name: 'John Farmer' },
      _count: { products: 12 },
      ...overrides,
    } as unknown as ShopResponse);

  const mockShop = makeShop();

  const mockShopList: ShopResponse[] = [
    mockShop,
    {
      ...makeShop({
        id: 'shop-002',
        ownerId: 'owner-002',
        name: 'Organic Valley',
        description: 'Organic food market',
        createdAt: new Date('2025-04-01'),
        updatedAt: new Date('2025-05-15'),
      }),
      owner: { id: 'owner-002', name: 'Jane Grower' },
      _count: { products: 8 },
    } as unknown as ShopResponse,
  ];

  beforeEach(async () => {
    const mockPrisma = {
      shop: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      order: {
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockShopRepo = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByName: jest.fn(),
      findByOwnerId: jest.fn(),
      findMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SHOP_PRISMA_REPOSITORY, useValue: mockShopRepo },
        { provide: CreateShopUseCase, useValue: { execute: jest.fn() } },
        { provide: GetShopUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateShopUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    service = module.get<ShopsService>(ShopsService);
    prisma = module.get(PrismaService);
    createShopUseCase = module.get(CreateShopUseCase);
    getShopUseCase = module.get(GetShopUseCase);
    updateShopUseCase = module.get(UpdateShopUseCase);
  });

  describe('create', () => {
    const dto: CreateShopDto = {
      name: 'Fresh Farm Market',
      description: 'We sell the freshest produce',
    };

    it('should create a shop successfully', async () => {
      createShopUseCase.execute.mockResolvedValue(mockShop as any);

      const result = await service.create(ownerId, dto);

      expect(result).toEqual(mockShop);
      expect(result.name).toBe('Fresh Farm Market');
      expect(createShopUseCase.execute).toHaveBeenCalledWith({
        name: dto.name,
        description: dto.description,
        ownerId,
      } as any);
    });

    it('should propagate error when seller already has a shop', async () => {
      createShopUseCase.execute.mockRejectedValue(new ShopAlreadyExistsException());

      await expect(service.create(ownerId, dto)).rejects.toThrow(ShopAlreadyExistsException);
    });

    it('should create shop with minimal data (no description)', async () => {
      const minimalDto: CreateShopDto = { name: 'Minimal Shop' };
      const minimalShop = makeShop({ name: 'Minimal Shop', description: null });
      createShopUseCase.execute.mockResolvedValue(minimalShop as any);

      const result = await service.create(ownerId, minimalDto);

      expect(result).toEqual(minimalShop);
      expect(createShopUseCase.execute).toHaveBeenCalledWith({
        name: 'Minimal Shop',
        description: undefined,
        ownerId,
      } as any);
    });
  });

  describe('createMyShop', () => {
    it('should delegate to create', async () => {
      const dto: CreateShopDto = { name: 'My Shop' };
      createShopUseCase.execute.mockResolvedValue(mockShop as any);

      const result = await service.createMyShop(ownerId, dto);

      expect(result).toEqual(mockShop);
      expect(createShopUseCase.execute).toHaveBeenCalledWith({
        name: 'My Shop',
        description: undefined,
        ownerId,
      } as any);
    });
  });

  describe('getMyShop', () => {
    it('should return the first shop owned by the seller', async () => {
      getShopUseCase.execute.mockResolvedValue([mockShop] as any);

      const result = await service.getMyShop(ownerId);

      expect(result).toEqual(mockShop);
      expect(getShopUseCase.execute).toHaveBeenCalledWith({
        ownerId,
        includeDeleted: false,
        limit: 1,
        offset: 0,
      });
    });

    it('should throw when seller has no shop', async () => {
      getShopUseCase.execute.mockResolvedValue([] as any);

      await expect(service.getMyShop('owner-no-shop')).rejects.toThrow(ResourceNotFoundException);
      await expect(service.getMyShop('owner-no-shop')).rejects.toThrow('Shop not found');
    });
  });

  describe('findAll', () => {
    it('should return paginated shops', async () => {
      const dto: QueryShopsDto = { page: 1, limit: 10 };
      getShopUseCase.execute.mockResolvedValue(mockShopList as any);

      const result = await service.findAll(dto);

      expect(result).toEqual(mockShopList);
      expect(getShopUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
      });
    });

    it('should return empty results when no shops exist', async () => {
      const dto: QueryShopsDto = { page: 1, limit: 10 };
      getShopUseCase.execute.mockResolvedValue([] as any);

      const result = await service.findAll(dto);

      expect(result).toEqual([]);
    });

    it('should pass search filter to use case', async () => {
      const dto: QueryShopsDto = { page: 1, limit: 5, search: 'organic' };
      const organicOnly = [mockShopList[1]];
      getShopUseCase.execute.mockResolvedValue(organicOnly as any);

      const result = await service.findAll(dto);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Organic Valley');
      expect(getShopUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 5,
        search: 'organic',
      });
    });

    it('should use undefined page/limit when not provided', async () => {
      const dto: QueryShopsDto = {};
      getShopUseCase.execute.mockResolvedValue(mockShopList as any);

      await service.findAll(dto);

      expect(getShopUseCase.execute).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        search: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should return a single shop by id', async () => {
      getShopUseCase.execute.mockResolvedValue(mockShop as any);

      const result = await service.findOne(shopId);

      expect(result).toEqual(mockShop);
      expect(getShopUseCase.execute).toHaveBeenCalledWith(shopId);
    });

    it('should throw when shop is not found', async () => {
      getShopUseCase.execute.mockRejectedValue(
        new ResourceNotFoundException('Shop', 'shop-nonexistent'),
      );

      await expect(service.findOne('shop-nonexistent')).rejects.toThrow(ResourceNotFoundException);
      await expect(service.findOne('shop-nonexistent')).rejects.toThrow(
        'Shop with identifier "shop-nonexistent" not found',
      );
    });
  });

  describe('update', () => {
    it('should update shop successfully', async () => {
      const dto: UpdateShopDto = {
        name: 'Updated Farm Market',
        description: 'Updated description',
      };
      const updatedShop = makeShop({ name: 'Updated Farm Market', description: 'Updated description' });

      prisma.shop.findFirst.mockResolvedValue({ id: shopId, ownerId } as any);
      prisma.shop.update.mockResolvedValue(updatedShop as any);

      const result = await service.update(ownerId, dto);

      expect(result).toEqual(updatedShop);
      expect(result.name).toBe('Updated Farm Market');
      expect(prisma.shop.findFirst).toHaveBeenCalledWith({
        where: { ownerId, deletedAt: null },
      });
      expect(prisma.shop.update).toHaveBeenCalledWith({
        where: { ownerId },
        data: dto,
      });
    });

    it('should throw when owner does not have a shop', async () => {
      prisma.shop.findFirst.mockResolvedValue(null);

      await expect(
        service.update('owner-no-shop', { name: 'New Name' }),
      ).rejects.toThrow(NotShopOwnerException);
    });

    it('should update only the name, leaving description unchanged', async () => {
      const updated = makeShop({ name: 'Renamed Only', description: 'We sell the freshest produce' });
      prisma.shop.findFirst.mockResolvedValue({ id: shopId, ownerId } as any);
      prisma.shop.update.mockResolvedValue(updated as any);

      const result = await service.update(ownerId, { name: 'Renamed Only' });

      expect(result.name).toBe('Renamed Only');
      expect(result.description).toBe('We sell the freshest produce');
      expect(prisma.shop.update).toHaveBeenCalledWith({
        where: { ownerId },
        data: { name: 'Renamed Only' },
      });
    });
  });

  describe('updateMyShop', () => {
    it('should delegate to update', async () => {
      const dto: UpdateShopDto = { name: 'My Updated Shop' };
      const updated = makeShop({ name: 'My Updated Shop' });
      prisma.shop.findFirst.mockResolvedValue({ id: shopId, ownerId } as any);
      prisma.shop.update.mockResolvedValue(updated as any);

      const result = await service.updateMyShop(ownerId, dto);

      expect(result).toEqual(updated);
      expect(prisma.shop.findFirst).toHaveBeenCalledWith({
        where: { ownerId, deletedAt: null },
      });
      expect(prisma.shop.update).toHaveBeenCalledWith({
        where: { ownerId },
        data: dto,
      });
    });
  });

  describe('findProducts', () => {
    it('should return paginated products for a shop', async () => {
      const dto: QueryShopProductsDto = { page: 1, limit: 10 };
      const mockProducts = [
        {
          id: 'prod-001',
          shopId,
          name: 'Organic Apple',
          retailPrice: '50000',
          status: ProductStatus.ACTIVE,
          images: [{ url: 'img1.jpg' }],
          stats: { viewCount: 100, orderCount: 20 },
        },
      ];

      getShopUseCase.execute.mockResolvedValue(mockShop as any);
      prisma.$transaction.mockResolvedValue([mockProducts, 1] as any);

      const result = await service.findProducts(shopId, dto);

      expect(result.items).toEqual(mockProducts);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(getShopUseCase.execute).toHaveBeenCalledWith(shopId);
    });

    it('should filter products by status', async () => {
      const dto: QueryShopProductsDto = { page: 1, limit: 10, status: ProductStatus.OUT_OF_STOCK };

      getShopUseCase.execute.mockResolvedValue(mockShop as any);
      prisma.$transaction.mockResolvedValue([[], 0] as any);

      await service.findProducts(shopId, dto);

      const findManyCall: any = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.status).toBe(ProductStatus.OUT_OF_STOCK);
    });

    it('should filter products by search term', async () => {
      const dto: QueryShopProductsDto = { page: 1, limit: 10, search: 'apple' };

      getShopUseCase.execute.mockResolvedValue(mockShop as any);
      prisma.$transaction.mockResolvedValue([[], 0] as any);

      await service.findProducts(shopId, dto);

      const findManyCall: any = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.name).toEqual({
        contains: 'apple',
        mode: 'insensitive',
      });
    });

    it('should throw when shop is not found', async () => {
      getShopUseCase.execute.mockRejectedValue(
        new ResourceNotFoundException('Shop', 'shop-nonexistent'),
      );

      await expect(
        service.findProducts('shop-nonexistent', { page: 1, limit: 10 }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('getMyStats', () => {
    it('should return comprehensive shop statistics', async () => {
      prisma.shop.findFirst.mockResolvedValue({ id: shopId } as any);
      prisma.$transaction.mockResolvedValue([
        20, 5, 10, 3, 50, 35, { _sum: { totalPrice: '2500000' } },
      ] as any);

      const stats = await service.getMyStats(ownerId);

      expect(stats).toEqual({
        shopId,
        revenue: '2500000',
        orders: { total: 20, pending: 5, delivered: 10, cancelled: 3 },
        products: { total: 50, active: 35 },
      });
      expect(prisma.shop.findFirst).toHaveBeenCalledWith({
        where: { ownerId, deletedAt: null },
        select: { id: true },
      });
    });

    it('should default revenue to "0" when no paid orders', async () => {
      prisma.shop.findFirst.mockResolvedValue({ id: shopId } as any);
      prisma.$transaction.mockResolvedValue([
        0, 0, 0, 0, 10, 8, { _sum: { totalPrice: null } },
      ] as any);

      const stats = await service.getMyStats(ownerId);

      expect(stats.revenue).toBe('0');
      expect(stats.orders.total).toBe(0);
      expect(stats.products.total).toBe(10);
    });

    it('should throw when owner has no shop', async () => {
      prisma.shop.findFirst.mockResolvedValue(null);

      await expect(service.getMyStats('owner-no-shop')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('assertOwner', () => {
    it('should not throw when owner has a shop', async () => {
      prisma.shop.findFirst.mockResolvedValue({ id: shopId, ownerId } as any);

      await expect(service.assertOwner(ownerId)).resolves.toBeUndefined();
    });

    it('should throw when owner has no shop', async () => {
      prisma.shop.findFirst.mockResolvedValue(null);

      await expect(service.assertOwner('owner-no-shop')).rejects.toThrow(NotShopOwnerException);
    });

    it('should exclude soft-deleted shops', async () => {
      prisma.shop.findFirst.mockResolvedValue(null as any);

      await service.assertOwner(ownerId).catch(() => {});

      expect(prisma.shop.findFirst).toHaveBeenCalledWith({
        where: { ownerId, deletedAt: null },
      });
    });
  });

  describe('getShopIdByOwner', () => {
    it('should return shop id for the owner', async () => {
      prisma.shop.findFirst.mockResolvedValue({ id: shopId } as any);

      const result = await service.getShopIdByOwner(ownerId);

      expect(result).toBe(shopId);
      expect(prisma.shop.findFirst).toHaveBeenCalledWith({
        where: { ownerId, deletedAt: null },
        select: { id: true },
      });
    });

    it('should throw when owner has no shop', async () => {
      prisma.shop.findFirst.mockResolvedValue(null);

      await expect(service.getShopIdByOwner('owner-no-shop')).rejects.toThrow(ResourceNotFoundException);
      await expect(service.getShopIdByOwner('owner-no-shop')).rejects.toThrow('Shop not found');
    });
  });
});
