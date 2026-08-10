import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { PRODUCT_PRISMA_REPOSITORY } from './infrastructure/repositories/product-prisma.repository';
import { UpdateProductUseCase } from './applications/use-cases/update-product.usecase';
import { DeleteProductUseCase } from './applications/use-cases/delete-product.usecase';
import { ResourceNotFoundException } from '@common/exceptions';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockPrismaService: any;
  let mockProductRepo: any;
  let mockUpdateProductUseCase: any;
  let mockDeleteProductUseCase: any;

  const mockShopId = 'shop-1';
  const mockSellerId = 'seller-1';

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    slug: 'test-product',
    description: 'A test product',
    shopId: mockShopId,
    sellerId: mockSellerId,
    category: 'OTHER',
    unit: 'PIECE',
    retailPrice: 100000,
    status: 'ACTIVE',
    isFeatured: false,
    deletedAt: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    shop: { id: mockShopId, name: 'Test Shop' },
    images: [
      {
        id: 'img-1',
        url: 'https://example.com/img1.jpg',
        isPrimary: true,
        sortOrder: 0,
        productId: 'product-1',
      },
    ],
    stats: { minPrice: 100000, maxPrice: 100000 },
    categories: [
      {
        categoryId: 'cat-1',
        productId: 'product-1',
        category: { id: 'cat-1', name: 'Fruits' },
      },
    ],
  };

  const mockInventory = {
    id: 'inv-1',
    productId: 'product-1',
    stock: 50,
    version: 1,
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    product: { id: 'product-1', name: 'Test Product', slug: 'test-product' },
  };

  const mockProductImage = {
    id: 'img-1',
    productId: 'product-1',
    url: 'https://example.com/img1.jpg',
    isPrimary: true,
    sortOrder: 0,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    mockPrismaService = {
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      inventory: {
        findMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
      },
      shop: {
        findFirst: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
      review: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      productImage: {
        findFirst: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((arg: any) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        if (typeof arg === 'function') {
          return arg(mockPrismaService);
        }
        return Promise.resolve();
      }),
    };

    mockProductRepo = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockUpdateProductUseCase = {
      publish: jest.fn(),
      unpublish: jest.fn(),
      updateStatus: jest.fn(),
    };

    mockDeleteProductUseCase = {
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PRODUCT_PRISMA_REPOSITORY, useValue: mockProductRepo },
        { provide: UpdateProductUseCase, useValue: mockUpdateProductUseCase },
        { provide: DeleteProductUseCase, useValue: mockDeleteProductUseCase },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  const givenShop = () => {
    mockPrismaService.shop.findFirst.mockResolvedValue({ id: mockShopId });
  };

  const givenShopError = () => {
    mockPrismaService.shop.findFirst.mockResolvedValue(null);
  };

  describe('listProducts', () => {
    it('should return paginated products', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.listProducts({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockProduct);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should return empty results when no products match', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      const result = await service.listProducts({});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should filter by search term', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.listProducts({ search: 'apple' });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'apple', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by categoryId', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.listProducts({ categoryId: 'cat-1' });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: { some: { categoryId: 'cat-1' } },
          }),
        }),
      );
    });

    it('should filter by shopId', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.listProducts({ shopId: 'shop-abc' });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shopId: 'shop-abc',
          }),
        }),
      );
    });

    it('should apply default pagination when page and limit are omitted', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.listProducts({});

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should calculate correct skip for page > 1', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.listProducts({ page: 3, limit: 10 });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('getProduct', () => {
    it('should return product by id', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.getProduct('product-1');

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-1', deletedAt: null, status: 'ACTIVE' },
        }),
      );
    });

    it('should throw ResourceNotFoundException when product not found', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.getProduct('nonexistent')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should throw ResourceNotFoundException when product exists but is not active', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.getProduct('draft-product')).rejects.toThrow(
        ResourceNotFoundException,
      );

      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'draft-product', deletedAt: null, status: 'ACTIVE' },
        }),
      );
    });
  });

  describe('getProductBySlug', () => {
    it('should return product by slug', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.getProductBySlug('test-product');

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'test-product', deletedAt: null, status: 'ACTIVE' },
        }),
      );
    });

    it('should throw ResourceNotFoundException when slug not found', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.getProductBySlug('no-slug')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('createProduct', () => {
    const createDto = {
      name: 'New Product',
      slug: 'new-product',
      description: 'A new product',
      categoryIds: ['cat-1'],
    };

    it('should create product successfully with categories', async () => {
      givenShop();
      mockPrismaService.category.findMany.mockResolvedValue([{ id: 'cat-1' }]);
      mockPrismaService.product.create.mockResolvedValue(mockProduct);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.createProduct(mockSellerId, createDto);

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shopId: mockShopId,
            sellerId: mockSellerId,
            name: 'New Product',
            slug: 'new-product',
            status: 'DRAFT',
            categories: {
              create: [{ categoryId: 'cat-1' }],
            },
          }),
        }),
      );
    });

    it('should throw BadRequestException for invalid categoryIds', async () => {
      givenShop();
      mockPrismaService.category.findMany.mockResolvedValue([
        { id: 'cat-1' },
      ]);

      await expect(
        service.createProduct(mockSellerId, {
          ...createDto,
          categoryIds: ['cat-1', 'cat-invalid'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create product without categoryIds', async () => {
      givenShop();
      mockPrismaService.product.create.mockResolvedValue(mockProduct);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      await service.createProduct(mockSellerId, {
        name: 'No Cats',
        slug: 'no-cats',
      });

      expect(mockPrismaService.category.findMany).not.toHaveBeenCalled();
    });

    it('should create product with empty categoryIds array', async () => {
      givenShop();
      mockPrismaService.product.create.mockResolvedValue(mockProduct);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      await service.createProduct(mockSellerId, {
        name: 'No Cats',
        slug: 'no-cats',
        categoryIds: [],
      });

      expect(mockPrismaService.category.findMany).not.toHaveBeenCalled();
    });

    it('should throw ResourceNotFoundException when shop not found', async () => {
      givenShopError();

      await expect(
        service.createProduct(mockSellerId, createDto),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('updateProduct', () => {
    const updateDto = {
      name: 'Updated Product',
      slug: 'updated-product',
      description: 'Updated description',
    };

    it('should update product successfully', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.category.findMany.mockResolvedValue([]);
      const updatedProduct = { ...mockProduct, name: 'Updated Product' };
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.updateProduct(
        mockSellerId,
        'product-1',
        updateDto,
      );

      expect(result).toEqual(updatedProduct);
      expect(mockPrismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-1' },
          data: expect.objectContaining({
            name: 'Updated Product',
            slug: 'updated-product',
            description: 'Updated description',
          }),
        }),
      );
    });

    it('should update product with new categories replacing old ones', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.category.findMany.mockResolvedValue([
        { id: 'cat-2' },
      ]);
      mockPrismaService.product.update.mockResolvedValue(mockProduct);

      await service.updateProduct(mockSellerId, 'product-1', {
        categoryIds: ['cat-2'],
      });

      expect(mockPrismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categories: {
              deleteMany: {},
              create: [{ categoryId: 'cat-2' }],
            },
          }),
        }),
      );
    });

    it('should not touch categories when categoryIds is undefined', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue(mockProduct);

      await service.updateProduct(mockSellerId, 'product-1', { name: 'X' });

      expect(mockPrismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categories: undefined,
          }),
        }),
      );
    });

    it('should throw ResourceNotFoundException when product not found', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProduct(mockSellerId, 'nonexistent', updateDto),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should throw ResourceNotFoundException for wrong shop', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProduct(mockSellerId, 'product-other-shop', updateDto),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully via use case', async () => {
      mockDeleteProductUseCase.delete.mockResolvedValue(undefined);

      const result = await service.deleteProduct(mockSellerId, 'product-1');

      expect(result).toEqual({ message: 'Product deleted' });
      expect(mockDeleteProductUseCase.delete).toHaveBeenCalledWith({
        productId: 'product-1',
        sellerId: mockSellerId,
      });
    });

    it('should propagate not found error from use case', async () => {
      mockDeleteProductUseCase.delete.mockRejectedValue(
        new ResourceNotFoundException('Product', 'product-1'),
      );

      await expect(
        service.deleteProduct(mockSellerId, 'nonexistent'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('publishProduct', () => {
    it('should delegate to UpdateProductUseCase.publish', async () => {
      const publishedProduct = { ...mockProduct, status: 'PENDING' };
      mockUpdateProductUseCase.publish.mockResolvedValue(publishedProduct);

      const result = await service.publishProduct(mockSellerId, 'product-1');

      expect(result).toEqual(publishedProduct);
      expect(mockUpdateProductUseCase.publish).toHaveBeenCalledWith({
        productId: 'product-1',
        sellerId: mockSellerId,
      });
    });
  });

  describe('unpublishProduct', () => {
    it('should delegate to UpdateProductUseCase.unpublish', async () => {
      const unpublishedProduct = { ...mockProduct, status: 'DRAFT' };
      mockUpdateProductUseCase.unpublish.mockResolvedValue(unpublishedProduct);

      const result = await service.unpublishProduct(mockSellerId, 'product-1');

      expect(result).toEqual(unpublishedProduct);
      expect(mockUpdateProductUseCase.unpublish).toHaveBeenCalledWith({
        productId: 'product-1',
        sellerId: mockSellerId,
      });
    });
  });

  describe('duplicateProduct', () => {
    it('should duplicate product successfully with categories and images', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      const duplicatedProduct = {
        ...mockProduct,
        id: 'product-2',
        name: 'Test Product Copy',
        status: 'DRAFT',
      };
      mockPrismaService.product.create.mockResolvedValue(duplicatedProduct);
      mockPrismaService.product.findUnique.mockResolvedValue(duplicatedProduct);

      const result = await service.duplicateProduct(mockSellerId, 'product-1');

      expect(result).toEqual(duplicatedProduct);
      expect(result!.status).toBe('DRAFT');
      expect(result!.isFeatured).toBe(false);
      expect(mockPrismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shopId: mockShopId,
            sellerId: mockSellerId,
            name: `${mockProduct.name} Copy`,
            slug: expect.stringMatching(/^test-product-copy-\d+$/),
            description: mockProduct.description,
            category: mockProduct.category,
            unit: mockProduct.unit,
            retailPrice: mockProduct.retailPrice,
            status: 'DRAFT',
            isFeatured: false,
            categories: {
              create: [{ categoryId: 'cat-1' }],
            },
            images: {
              create: [
                {
                  url: 'https://example.com/img1.jpg',
                  isPrimary: true,
                  sortOrder: 0,
                },
              ],
            },
          }),
        }),
      );
    });

    it('should throw ResourceNotFoundException when product not found', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(
        service.duplicateProduct(mockSellerId, 'nonexistent'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('listInventory', () => {
    it('should return paginated inventory for seller shop', async () => {
      givenShop();
      mockPrismaService.inventory.findMany.mockResolvedValue([mockInventory]);
      mockPrismaService.inventory.count.mockResolvedValue(1);

      const result = await service.listInventory(mockSellerId, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockInventory);
      expect(result.total).toBe(1);
      expect(mockPrismaService.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            product: { shopId: mockShopId, deletedAt: null },
          },
        }),
      );
    });

    it('should return empty inventory list', async () => {
      givenShop();
      mockPrismaService.inventory.findMany.mockResolvedValue([]);
      mockPrismaService.inventory.count.mockResolvedValue(0);

      const result = await service.listInventory(mockSellerId, {});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('updateInventory', () => {
    it('should upsert inventory successfully', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.inventory.upsert.mockResolvedValue(mockInventory);

      const result = await service.updateInventory(
        mockSellerId,
        'product-1',
        { stock: 100 },
      );

      expect(result).toEqual(mockInventory);
      expect(mockPrismaService.inventory.upsert).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        create: { productId: 'product-1', stock: 100 },
        update: { stock: 100, version: { increment: 1 } },
      });
    });

    it('should throw ResourceNotFoundException when product not found', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(
        service.updateInventory(mockSellerId, 'nonexistent', { stock: 100 }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('addProductImage', () => {
    it('should add product image and set as primary', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      const newImage = {
        ...mockProductImage,
        id: 'img-2',
        url: 'https://example.com/img2.jpg',
        isPrimary: true,
      };
      mockPrismaService.productImage.create.mockResolvedValue(newImage);

      const result = await service.addProductImage(
        mockSellerId,
        'product-1',
        { url: 'https://example.com/img2.jpg', isPrimary: true, sortOrder: 2 },
      );

      expect(result).toEqual(newImage);
      expect(mockPrismaService.productImage.updateMany).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        data: { isPrimary: false },
      });
      expect(mockPrismaService.productImage.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
          url: 'https://example.com/img2.jpg',
          isPrimary: true,
          sortOrder: 2,
        },
      });
    });

    it('should add product image without setting as primary', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      const newImage = { ...mockProductImage, id: 'img-2', isPrimary: false };
      mockPrismaService.productImage.create.mockResolvedValue(newImage);

      await service.addProductImage(mockSellerId, 'product-1', {
        url: 'https://example.com/img2.jpg',
      });

      expect(mockPrismaService.productImage.updateMany).not.toHaveBeenCalled();
      expect(mockPrismaService.productImage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPrimary: false,
          sortOrder: 0,
        }),
      });
    });

    it('should throw ResourceNotFoundException when product not found', async () => {
      givenShop();
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(
        service.addProductImage(mockSellerId, 'nonexistent', {
          url: 'https://example.com/img.jpg',
        }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('deleteProductImage', () => {
    it('should delete product image successfully', async () => {
      givenShop();
      mockPrismaService.productImage.findFirst.mockResolvedValue(
        mockProductImage,
      );
      mockPrismaService.productImage.delete.mockResolvedValue(mockProductImage);

      const result = await service.deleteProductImage(mockSellerId, 'img-1');

      expect(result).toEqual({ message: 'Product image deleted' });
      expect(mockPrismaService.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'img-1' },
      });
    });

    it('should throw ResourceNotFoundException when image not found', async () => {
      givenShop();
      mockPrismaService.productImage.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteProductImage(mockSellerId, 'nonexistent'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('setPrimaryProductImage', () => {
    it('should set image as primary successfully', async () => {
      givenShop();
      mockPrismaService.productImage.findFirst.mockResolvedValue(
        mockProductImage,
      );
      const updatedImage = { ...mockProductImage, isPrimary: true };
      mockPrismaService.productImage.update.mockResolvedValue(updatedImage);

      const result = await service.setPrimaryProductImage(
        mockSellerId,
        'img-1',
      );

      expect(result).toEqual(updatedImage);
      expect(mockPrismaService.productImage.updateMany).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        data: { isPrimary: false },
      });
      expect(mockPrismaService.productImage.update).toHaveBeenCalledWith({
        where: { id: 'img-1' },
        data: { isPrimary: true },
      });
    });

    it('should throw ResourceNotFoundException when image not found', async () => {
      givenShop();
      mockPrismaService.productImage.findFirst.mockResolvedValue(null);

      await expect(
        service.setPrimaryProductImage(mockSellerId, 'nonexistent'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
