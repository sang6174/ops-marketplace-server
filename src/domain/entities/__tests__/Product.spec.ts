import { describe, it, expect, beforeEach } from '@jest/globals';
import { Product } from '../products/Product';
import { ProductId } from '../../value-objects/ProductId';
import { ProductName } from '../../value-objects/ProductName';
import { ProductDescription } from '../../value-objects/ProductDescription';
import { ProductOrigin } from '../../value-objects/ProductOrigin';
import { ProductPrice } from '../../value-objects/ProductPrice';
import { WholesaleInfo } from '../../value-objects/WholesaleInfo';
import { ProductSeason } from '../../value-objects/ProductSeason';
import { ProductCertification } from '../../value-objects/ProductCertification';
import { ProductCategory, ProductUnit, ProductStatus } from '../enums.enum';

describe('Product Aggregate', () => {
  const mockProductId = ProductId.generate();
  const mockSellerId = 'seller-123';
  const mockShopId = 'shop-456';
  const mockCategory = ProductCategory.FRUITS;
  const mockUnit = ProductUnit.KG;
  const mockName = ProductName.create('Organic Apple');
  const mockDescription = ProductDescription.create(
    'Fresh organic apples from Sapa',
  );
  const mockRetailPrice = ProductPrice.fromNumber(150_000);
  const mockWholesaleInfo = WholesaleInfo.create(
    ProductPrice.fromNumber(120_000),
    10,
  );
  const mockOrigin = ProductOrigin.create('Vietnam');
  const mockSeason = ProductSeason.create(
    new Date('2025-01-01'),
    new Date('2025-03-31'),
  );
  const mockCertifications = [
    ProductCertification.create('Organic'),
    ProductCertification.create('FairTrade'),
  ];
  const mockCreatedAt = new Date('2025-01-01T00:00:00.000Z');

  let product: Product;

  beforeEach(() => {
    product = Product.create({
      id: mockProductId,
      sellerId: mockSellerId,
      shopId: mockShopId,
      category: mockCategory,
      unit: mockUnit,
      name: mockName,
      description: mockDescription,
      retailPrice: mockRetailPrice,
      wholesaleInfo: mockWholesaleInfo,
      origin: mockOrigin,
      season: mockSeason,
      certifications: mockCertifications,
      createdAt: mockCreatedAt,
    });
  });

  describe('create()', () => {
    it('should create product with all fields', () => {
      expect(product.id).toBe(mockProductId);
      expect(product.sellerId).toBe(mockSellerId);
      expect(product.shopId).toBe(mockShopId);
      expect(product.category).toBe(mockCategory);
      expect(product.unit).toBe(mockUnit);
      expect(product.name).toBe(mockName);
      expect(product.description).toBe(mockDescription);
      expect(product.retailPrice).toBe(mockRetailPrice);
      expect(product.wholesaleInfo).toBe(mockWholesaleInfo);
      expect(product.origin).toBe(mockOrigin);
      expect(product.season).toBe(mockSeason);
      expect(product.certifications).toBeDefined();
      expect(product.certifications.items).toHaveLength(2);
      expect(product.status).toBe(ProductStatus.DRAFT);
      expect(product.createdAt).toBe(mockCreatedAt);
      expect(product.updatedAt).toBe(mockCreatedAt);
    });

    it('should allow null wholesaleInfo and null season', () => {
      const productNoWholesale = Product.create({
        id: ProductId.generate(),
        sellerId: mockSellerId,
        shopId: mockShopId,
        category: mockCategory,
        unit: mockUnit,
        name: mockName,
        description: mockDescription,
        retailPrice: mockRetailPrice,
        wholesaleInfo: null,
        origin: mockOrigin,
        season: null,
        certifications: [],
      });
      expect(productNoWholesale.wholesaleInfo).toBeNull();
      expect(productNoWholesale.season).toBeNull();
      expect(productNoWholesale.certifications.items).toHaveLength(0);
    });

    it('should default to empty certifications if not provided', () => {
      const productNoCerts = Product.create({
        id: ProductId.generate(),
        sellerId: mockSellerId,
        shopId: mockShopId,
        category: mockCategory,
        unit: mockUnit,
        name: mockName,
        description: mockDescription,
        retailPrice: mockRetailPrice,
        origin: mockOrigin,
      });
      expect(productNoCerts.certifications.items).toHaveLength(0);
    });
  });

  describe('reconstitute()', () => {
    it('should recreate product from persistence data', () => {
      const updatedAt = new Date('2025-02-01');
      const reconstituted = Product.reconstitute({
        id: mockProductId,
        sellerId: mockSellerId,
        shopId: mockShopId,
        category: mockCategory,
        unit: mockUnit,
        name: mockName,
        description: mockDescription,
        retailPrice: mockRetailPrice,
        wholesaleInfo: mockWholesaleInfo,
        origin: mockOrigin,
        season: mockSeason,
        certifications: product.certifications,
        createdAt: mockCreatedAt,
        updatedAt,
        status: ProductStatus.ACTIVE,
      });

      expect(reconstituted.id).toBe(mockProductId);
      expect(reconstituted.sellerId).toBe(mockSellerId);
      expect(reconstituted.shopId).toBe(mockShopId);
      expect(reconstituted.category).toBe(mockCategory);
      expect(reconstituted.unit).toBe(mockUnit);
      expect(reconstituted.name).toBe(mockName);
      expect(reconstituted.description).toBe(mockDescription);
      expect(reconstituted.retailPrice).toBe(mockRetailPrice);
      expect(reconstituted.wholesaleInfo).toBe(mockWholesaleInfo);
      expect(reconstituted.origin).toBe(mockOrigin);
      expect(reconstituted.season).toBe(mockSeason);
      expect(reconstituted.certifications).toEqual(product.certifications);
      expect(reconstituted.status).toBe(ProductStatus.ACTIVE);
      expect(reconstituted.createdAt).toBe(mockCreatedAt);
      expect(reconstituted.updatedAt).toBe(updatedAt);
    });

    it('should create correct state from status', () => {
      const pendingProduct = Product.reconstitute({
        id: mockProductId,
        sellerId: mockSellerId,
        shopId: mockShopId,
        category: mockCategory,
        unit: mockUnit,
        name: mockName,
        description: mockDescription,
        retailPrice: mockRetailPrice,
        wholesaleInfo: mockWholesaleInfo,
        origin: mockOrigin,
        season: mockSeason,
        certifications: product.certifications,
        createdAt: mockCreatedAt,
        updatedAt: new Date(),
        status: ProductStatus.PENDING,
      });
      expect(pendingProduct.status).toBe(ProductStatus.PENDING);

      const outOfStock = Product.reconstitute({
        id: mockProductId,
        sellerId: mockSellerId,
        shopId: mockShopId,
        category: mockCategory,
        unit: mockUnit,
        name: mockName,
        description: mockDescription,
        retailPrice: mockRetailPrice,
        wholesaleInfo: mockWholesaleInfo,
        origin: mockOrigin,
        season: mockSeason,
        certifications: product.certifications,
        createdAt: mockCreatedAt,
        updatedAt: new Date(),
        status: ProductStatus.OUT_OF_STOCK,
      });
      expect(outOfStock.status).toBe(ProductStatus.OUT_OF_STOCK);
    });
  });

  describe('getters', () => {
    it('should return correct values', () => {
      expect(product.id).toBe(mockProductId);
      expect(product.sellerId).toBe(mockSellerId);
      expect(product.shopId).toBe(mockShopId);
      expect(product.category).toBe(mockCategory);
      expect(product.unit).toBe(mockUnit);
      expect(product.name).toBe(mockName);
      expect(product.description).toBe(mockDescription);
      expect(product.retailPrice).toBe(mockRetailPrice);
      expect(product.wholesaleInfo).toBe(mockWholesaleInfo);
      expect(product.origin).toBe(mockOrigin);
      expect(product.season).toBe(mockSeason);
      expect(product.status).toBe(ProductStatus.DRAFT);
      expect(product.createdAt).toBe(mockCreatedAt);
      expect(product.updatedAt).toBe(mockCreatedAt);
    });
  });

  describe('updateInfo()', () => {
    it('should update name', () => {
      const newName = ProductName.create('Premium Apple');
      product.updateInfo({ name: newName });
      expect(product.name).toBe(newName);
      expect(product.updatedAt).not.toBe(mockCreatedAt);
    });

    it('should update description', () => {
      const newDesc = ProductDescription.create('New description');
      product.updateInfo({ description: newDesc });
      expect(product.description).toBe(newDesc);
    });

    it('should update category', () => {
      product.updateInfo({ category: ProductCategory.VEGETABLES });
      expect(product.category).toBe(ProductCategory.VEGETABLES);
    });

    it('should update unit', () => {
      product.updateInfo({ unit: ProductUnit.PIECE });
      expect(product.unit).toBe(ProductUnit.PIECE);
    });

    it('should update origin', () => {
      const newOrigin = ProductOrigin.create('France');
      product.updateInfo({ origin: newOrigin });
      expect(product.origin).toBe(newOrigin);
    });

    it('should update multiple fields at once', () => {
      const newName = ProductName.create('New Name');
      const newDesc = ProductDescription.create('New Desc');
      product.updateInfo({
        name: newName,
        description: newDesc,
        category: ProductCategory.MEAT,
      });
      expect(product.name).toBe(newName);
      expect(product.description).toBe(newDesc);
      expect(product.category).toBe(ProductCategory.MEAT);
    });
  });

  describe('updatePricing()', () => {
    it('should update retail price', () => {
      const newPrice = ProductPrice.fromNumber(200000);
      product.updatePricing({ retailPrice: newPrice });
      expect(product.retailPrice).toBe(newPrice);
    });

    it('should update wholesale info', () => {
      const newRetail = ProductPrice.fromNumber(200_000);
      const newWholesale = WholesaleInfo.create(
        ProductPrice.fromNumber(160_000),
        20,
      );
      product.updatePricing({
        retailPrice: newRetail,
        wholesaleInfo: newWholesale,
      });
      expect(product.retailPrice).toBe(newRetail);
      expect(product.wholesaleInfo).toBe(newWholesale);
    });
    it('should allow setting wholesaleInfo to null', () => {
      product.updatePricing({ wholesaleInfo: null });
      expect(product.wholesaleInfo).toBeNull();
    });

    it('should throw error if wholesale price >= retail price', () => {
      const invalidWholesale = WholesaleInfo.create(
        ProductPrice.fromNumber(150_000),
        10,
      );
      expect(() => {
        product.updatePricing({ wholesaleInfo: invalidWholesale });
      }).toThrow('Wholesale price must be less than retail price');
    });

    it('should update both retail and wholesale', () => {
      const newRetail = ProductPrice.fromNumber(250_000);
      const newWholesale = WholesaleInfo.create(
        ProductPrice.fromNumber(200_000),
        15,
      );
      product.updatePricing({
        retailPrice: newRetail,
        wholesaleInfo: newWholesale,
      });
      expect(product.retailPrice).toBe(newRetail);
      expect(product.wholesaleInfo).toBe(newWholesale);
    });
  });

  describe('updateSeason()', () => {
    it('should update season', () => {
      const newSeason = ProductSeason.create(
        new Date('2025-06-01'),
        new Date('2025-08-31'),
      );
      product.updateSeason(newSeason);
      expect(product.season).toBe(newSeason);
    });

    it('should allow setting season to null', () => {
      product.updateSeason(null);
      expect(product.season).toBeNull();
    });
  });

  // ===== Certifications =====
  describe('addCertification()', () => {
    it('should add new certification', () => {
      const newCert = ProductCertification.create('HACCP');
      product.addCertification(newCert);
      expect(product.certifications.items).toHaveLength(3);
      expect(product.certifications.items).toContainEqual(newCert);
    });

    it('should not add duplicate certification', () => {
      const duplicate = ProductCertification.create('Organic');
      const before = product.certifications.items.length;
      product.addCertification(duplicate);
      expect(product.certifications.items).toHaveLength(before);
    });

    it('should touch updatedAt', () => {
      const cert = ProductCertification.create('NewCert');
      const oldUpdatedAt = product.updatedAt;
      product.addCertification(cert);
      expect(product.updatedAt).not.toBe(oldUpdatedAt);
    });
  });

  describe('removeCertification()', () => {
    it('should remove existing certification', () => {
      const cert = ProductCertification.create('Organic');
      product.removeCertification(cert);
      expect(product.certifications.items).toHaveLength(1);
      expect(product.certifications.items).not.toContainEqual(cert);
    });

    it('should throw error if certification not found', () => {
      const nonExisting = ProductCertification.create('NonExist');
      expect(() => product.removeCertification(nonExisting));
    });
  });

  describe('state transitions', () => {
    describe('publish()', () => {
      it('should transition from DRAFT to PENDING', () => {
        expect(product.status).toBe(ProductStatus.DRAFT);
        product.publish();
        expect(product.status).toBe(ProductStatus.PENDING);
        expect(product.updatedAt).not.toBe(mockCreatedAt);
      });

      it('should throw error if already PENDING', () => {
        product.publish();
        expect(() => product.publish()).toThrow(
          'Cannot publish from state PENDING',
        );
      });

      it('should throw error if ACTIVE', () => {
        product.publish();
        product.confirmByAdmin();
        expect(() => product.publish()).toThrow(
          'Cannot publish from state ACTIVE',
        );
      });

      it('should throw error if OUT_OF_STOCK', () => {
        product.publish();
        product.confirmByAdmin();
        product.markOutOfStock();
        expect(() => product.publish()).toThrow(
          'Cannot publish from state OUT_OF_STOCK',
        );
      });

      it('should throw error if DISCONTINUED', () => {
        product.publish();
        product.confirmByAdmin();
        product.unpublish();
      });
    });

    describe('confirmByAdmin()', () => {
      it('should transition from PENDING to ACTIVE', () => {
        product.publish();
        expect(product.status).toBe(ProductStatus.PENDING);
        product.confirmByAdmin();
        expect(product.status).toBe(ProductStatus.ACTIVE);
      });

      it('should throw error if not PENDING', () => {
        expect(() => product.confirmByAdmin()).toThrow(
          'Cannot confirm from state DRAFT',
        );
      });
    });

    describe('markOutOfStock()', () => {
      it('should transition from ACTIVE to OUT_OF_STOCK', () => {
        product.publish();
        product.confirmByAdmin();
        expect(product.status).toBe(ProductStatus.ACTIVE);
        product.markOutOfStock();
        expect(product.status).toBe(ProductStatus.OUT_OF_STOCK);
      });

      it('should throw error if not ACTIVE', () => {
        expect(() => product.markOutOfStock()).toThrow(
          'Cannot mark out of stock from state DRAFT',
        );
      });
    });

    describe('markInStock()', () => {
      it('should transition from OUT_OF_STOCK to ACTIVE', () => {
        product.publish();
        product.confirmByAdmin();
        product.markOutOfStock();
        expect(product.status).toBe(ProductStatus.OUT_OF_STOCK);
        product.markInStock();
        expect(product.status).toBe(ProductStatus.ACTIVE);
      });

      it('should throw error if not OUT_OF_STOCK', () => {
        expect(() => product.markInStock()).toThrow(
          'Cannot mark in stock from state DRAFT',
        );
      });
    });

    describe('unpublish()', () => {
      it('should transition from PENDING to DRAFT', () => {
        product.publish();
        expect(product.status).toBe(ProductStatus.PENDING);
        product.unpublish();
        expect(product.status).toBe(ProductStatus.DRAFT);
      });

      it('should transition from ACTIVE to DRAFT', () => {
        product.publish();
        product.confirmByAdmin();
        expect(product.status).toBe(ProductStatus.ACTIVE);
        product.unpublish();
        expect(product.status).toBe(ProductStatus.DRAFT);
      });

      it('should throw error if DRAFT', () => {
        expect(() => product.unpublish()).toThrow(
          'Cannot unpublish from state DRAFT',
        );
      });

      it('should throw error if OUT_OF_STOCK', () => {
        product.publish();
        product.confirmByAdmin();
        product.markOutOfStock();
        expect(() => product.unpublish()).toThrow(
          'Cannot unpublish from state OUT_OF_STOCK',
        );
      });
    });
  });

  describe('isInSeason()', () => {
    it('should return true if date within season', () => {
      const inSeasonDate = new Date('2025-02-15');
      expect(product.isInSeason(inSeasonDate)).toBe(true);
    });

    it('should return false if date before season start', () => {
      const before = new Date('2024-12-31');
      expect(product.isInSeason(before)).toBe(false);
    });

    it('should return false if date after season end', () => {
      const after = new Date('2025-04-01');
      expect(product.isInSeason(after)).toBe(false);
    });

    it('should return false if product has no season', () => {
      const noSeasonProduct = Product.create({
        id: ProductId.generate(),
        sellerId: mockSellerId,
        shopId: mockShopId,
        category: mockCategory,
        unit: mockUnit,
        name: mockName,
        description: mockDescription,
        retailPrice: mockRetailPrice,
        origin: mockOrigin,
        season: null,
      });
      expect(noSeasonProduct.isInSeason()).toBe(false);
    });

    it('should use current date by default', () => {
      const productInSeason = Product.create({
        id: ProductId.generate(),
        sellerId: mockSellerId,
        shopId: mockShopId,
        category: mockCategory,
        unit: mockUnit,
        name: mockName,
        description: mockDescription,
        retailPrice: mockRetailPrice,
        origin: mockOrigin,
        season: ProductSeason.create(
          new Date('2020-01-01'),
          new Date('2030-12-31'),
        ),
      });
      expect(productInSeason.isInSeason()).toBe(true);
    });
  });

  describe('hasWholesale()', () => {
    it('should return true if wholesaleInfo exists', () => {
      expect(product.hasWholesale()).toBe(true);
    });

    it('should return false if wholesaleInfo is null', () => {
      const noWholesale = Product.create({
        id: ProductId.generate(),
        sellerId: mockSellerId,
        shopId: mockShopId,
        category: mockCategory,
        unit: mockUnit,
        name: mockName,
        description: mockDescription,
        retailPrice: mockRetailPrice,
        origin: mockOrigin,
        wholesaleInfo: null,
      });
      expect(noWholesale.hasWholesale()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should allow repeated state transitions', () => {
      product.publish();
      product.confirmByAdmin();
      product.markOutOfStock();
      product.markInStock();
      product.unpublish();
      expect(product.status).toBe(ProductStatus.DRAFT);
    });

    it('should update updatedAt on every change', () => {
      const before = product.updatedAt;
      product.updateInfo({ name: ProductName.create('New') });
      expect(product.updatedAt).not.toBe(before);
    });

    it('should maintain wholesaleInfo when updating retail price only', () => {
      const newRetail = ProductPrice.fromNumber(200_000);
      product.updatePricing({ retailPrice: newRetail });
      expect(product.wholesaleInfo).toBe(mockWholesaleInfo);
    });

    it('should maintain certifications when updating info', () => {
      const certsBefore = product.certifications.items.length;
      product.updateInfo({ name: ProductName.create('New') });
      expect(product.certifications.items).toHaveLength(certsBefore);
    });
  });
});
