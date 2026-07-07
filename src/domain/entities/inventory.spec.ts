import { describe, it, expect, beforeEach } from '@jest/globals';
import { Inventory } from './inventory';

describe('Inventory Domain Entity', () => {
  describe('Inventory.create', () => {
    it('should create inventory with defaults', () => {
      const inventory = Inventory.create('product-1');

      expect(inventory.productId).toBe('product-1');
      expect(inventory.quantity).toBe(0);
      expect(inventory.reservedQuantity).toBe(0);
      expect(inventory.minStockThreshold).toBe(10);
    });

    it('should create inventory with custom threshold', () => {
      const inventory = Inventory.create('product-1', 50);

      expect(inventory.minStockThreshold).toBe(50);
    });

    it('should have id and timestamps', () => {
      const inventory = Inventory.create('product-1');

      expect(inventory.id).toBeDefined();
      expect(inventory.lastRestockedAt).toBeInstanceOf(Date);
      expect(inventory.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('restock', () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create('product-1', 20);
    });

    it('should increase quantity', () => {
      inventory.restock(100);

      expect(inventory.quantity).toBe(100);
    });

    it('should support multiple restocks', () => {
      inventory.restock(50);
      inventory.restock(30);

      expect(inventory.quantity).toBe(80);
    });

    it('should update lastRestockedAt', () => {
      const oldDate = inventory.lastRestockedAt;
      inventory.restock(100);

      expect(inventory.lastRestockedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });

    it('should update updatedAt', () => {
      const oldDate = inventory.updatedAt;
      inventory.restock(100);

      expect(inventory.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });

    it('should throw error on zero quantity', () => {
      expect(() => inventory.restock(0)).toThrow(
        'Restock quantity must be greater than 0',
      );
    });

    it('should throw error on negative quantity', () => {
      expect(() => inventory.restock(-10)).toThrow(
        'Restock quantity must be greater than 0',
      );
    });
  });

  describe('outbound', () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create('product-1', 20);
      inventory.restock(100);
    });

    it('should decrease quantity', () => {
      inventory.outbound(30);

      expect(inventory.quantity).toBe(70);
    });

    it('should throw error if insufficient stock', () => {
      expect(() => inventory.outbound(150)).toThrow(
        'Not enough available stock. Available: 100, Requested: 150',
      );
    });

    it('should throw error on zero quantity', () => {
      expect(() => inventory.outbound(0)).toThrow(
        'Outbound quantity must be greater than 0',
      );
    });

    it('should throw error on negative quantity', () => {
      expect(() => inventory.outbound(-10)).toThrow(
        'Outbound quantity must be greater than 0',
      );
    });

    it('should reduce reserved quantity when outbounding', () => {
      inventory.reserve(30);
      inventory.outbound(50);

      // qty: 100 - 50 = 50
      // reserved: min(30, 50) = 30 → 30 - 30 = 0
      expect(inventory.quantity).toBe(50);
      expect(inventory.reservedQuantity).toBe(0);
    });

    it('should handle outbound with partial reserved reduction', () => {
      inventory.reserve(30);
      inventory.outbound(20);

      // qty: 100 - 20 = 80
      // reserved: min(30, 20) = 20 → 30 - 20 = 10
      expect(inventory.quantity).toBe(80);
      expect(inventory.reservedQuantity).toBe(10);
    });

    it('should update updatedAt', () => {
      const oldDate = inventory.updatedAt;
      inventory.outbound(10);

      expect(inventory.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });
  });

  describe('reserve', () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create('product-1', 20);
      inventory.restock(100);
    });

    it('should reserve quantity', () => {
      inventory.reserve(30);

      expect(inventory.reservedQuantity).toBe(30);
      expect(inventory.quantity).toBe(100); // quantity doesn't change
    });

    it('should reduce available quantity', () => {
      inventory.reserve(30);

      expect(inventory.getAvailableQuantity()).toBe(70);
    });

    it('should throw error if insufficient available stock', () => {
      inventory.reserve(80);

      expect(() => inventory.reserve(30)).toThrow(
        'Not enough stock to reserve. Available: 20, Requested: 30',
      );
    });

    it('should throw error on zero quantity', () => {
      expect(() => inventory.reserve(0)).toThrow(
        'Reserve quantity must be greater than 0',
      );
    });

    it('should throw error on negative quantity', () => {
      expect(() => inventory.reserve(-10)).toThrow(
        'Reserve quantity must be greater than 0',
      );
    });

    it('should allow reserving available stock exactly', () => {
      expect(() => inventory.reserve(100)).not.toThrow();
      expect(inventory.reservedQuantity).toBe(100);
      expect(inventory.getAvailableQuantity()).toBe(0);
    });

    it('should update updatedAt', () => {
      const oldDate = inventory.updatedAt;
      inventory.reserve(10);

      expect(inventory.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });
  });

  describe('unreserve', () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create('product-1', 20);
      inventory.restock(100);
      inventory.reserve(50);
    });

    it('should decrease reserved quantity', () => {
      inventory.unreserve(20);

      expect(inventory.reservedQuantity).toBe(30);
    });

    it('should increase available quantity', () => {
      const availableBefore = inventory.getAvailableQuantity();
      inventory.unreserve(20);
      const availableAfter = inventory.getAvailableQuantity();

      expect(availableAfter).toBe(availableBefore + 20);
    });

    it('should throw error if unreserving more than reserved', () => {
      expect(() => inventory.unreserve(60)).toThrow(
        'Cannot unreserve more than reserved. Reserved: 50, Requested: 60',
      );
    });

    it('should throw error on zero quantity', () => {
      expect(() => inventory.unreserve(0)).toThrow(
        'Unreserve quantity must be greater than 0',
      );
    });

    it('should throw error on negative quantity', () => {
      expect(() => inventory.unreserve(-10)).toThrow(
        'Unreserve quantity must be greater than 0',
      );
    });

    it('should allow unreserving exact amount', () => {
      expect(() => inventory.unreserve(50)).not.toThrow();
      expect(inventory.reservedQuantity).toBe(0);
    });

    it('should update updatedAt', () => {
      const oldDate = inventory.updatedAt;
      inventory.unreserve(10);

      expect(inventory.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });
  });

  describe('updateMinStockThreshold', () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create('product-1', 20);
    });

    it('should update threshold', () => {
      inventory.updateMinStockThreshold(50);

      expect(inventory.minStockThreshold).toBe(50);
    });

    it('should allow zero threshold', () => {
      expect(() => inventory.updateMinStockThreshold(0)).not.toThrow();
      expect(inventory.minStockThreshold).toBe(0);
    });

    it('should throw error on negative threshold', () => {
      expect(() => inventory.updateMinStockThreshold(-5)).toThrow(
        'Min stock threshold cannot be negative',
      );
    });

    it('should update updatedAt', () => {
      const oldDate = inventory.updatedAt;
      inventory.updateMinStockThreshold(30);

      expect(inventory.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });
  });

  describe('isLowStock', () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create('product-1', 100);
      inventory.restock(100);
    });

    it('should return false when above threshold', () => {
      expect(inventory.isLowStock()).toBe(false);
    });

    it('should return true when below threshold', () => {
      inventory.outbound(50);

      expect(inventory.isLowStock()).toBe(true);
    });

    it('should use custom threshold percent', () => {
      // threshold = 100, quantity = 100
      // 50% threshold = 50
      expect(inventory.isLowStock(50)).toBe(false);

      inventory.outbound(40);
      // quantity = 60, 50% of 100 = 50, 60 > 50 = false
      expect(inventory.isLowStock(50)).toBe(false);

      inventory.outbound(20);
      // quantity = 40, 50% of 100 = 50, 40 < 50 = true
      expect(inventory.isLowStock(50)).toBe(true);
    });

    it('should handle 100% threshold', () => {
      // quantity must be less than threshold to be low stock
      expect(inventory.isLowStock(100)).toBe(false);

      inventory.outbound(1);
      expect(inventory.isLowStock(100)).toBe(true);
    });
  });

  describe('getAvailableQuantity', () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create('product-1', 20);
      inventory.restock(100);
    });

    it('should return quantity when nothing reserved', () => {
      expect(inventory.getAvailableQuantity()).toBe(100);
    });

    it('should subtract reserved from quantity', () => {
      inventory.reserve(30);

      expect(inventory.getAvailableQuantity()).toBe(70);
    });

    it('should handle zero available', () => {
      inventory.reserve(100);

      expect(inventory.getAvailableQuantity()).toBe(0);
    });
  });

  describe('updateLastRestockedAt', () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create('product-1');
    });

    it('should update last restocked date', () => {
      const newDate = new Date('2024-06-15');
      inventory.updateLastRestockedAt(newDate);

      expect(inventory.lastRestockedAt).toEqual(newDate);
    });

    it('should update updatedAt timestamp', () => {
      const oldUpdatedAt = inventory.updatedAt;
      const newDate = new Date('2024-06-15');
      inventory.updateLastRestockedAt(newDate);

      expect(inventory.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldUpdatedAt.getTime(),
      );
    });

    it('should allow setting to past date', () => {
      const pastDate = new Date('2000-01-01');
      expect(() => inventory.updateLastRestockedAt(pastDate)).not.toThrow();
      expect(inventory.lastRestockedAt).toEqual(pastDate);
    });
  });

  describe('getters', () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create('product-1', 30);
      inventory.restock(100);
      inventory.reserve(25);
    });

    it('should return all properties', () => {
      expect(inventory.id).toBeDefined();
      expect(inventory.productId).toBe('product-1');
      expect(inventory.quantity).toBe(100);
      expect(inventory.reservedQuantity).toBe(25);
      expect(inventory.minStockThreshold).toBe(30);
      expect(inventory.lastRestockedAt).toBeInstanceOf(Date);
      expect(inventory.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('complex scenarios', () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create('product-1', 20);
    });

    it('should handle full inventory lifecycle', () => {
      // Initial restock
      inventory.restock(100);
      expect(inventory.quantity).toBe(100);

      // Partial reserve
      inventory.reserve(30);
      expect(inventory.getAvailableQuantity()).toBe(70);

      // Partial unreserve
      inventory.unreserve(10);
      expect(inventory.getAvailableQuantity()).toBe(80);

      // Outbound from available
      inventory.outbound(50);
      // qty: 100 - 50 = 50
      // reserved: min(20, 50) = 20
      expect(inventory.quantity).toBe(50);
      expect(inventory.reservedQuantity).toBe(0);

      // Another restock
      inventory.restock(50);
      expect(inventory.quantity).toBe(100);

      // Not low stock anymore
      expect(inventory.isLowStock()).toBe(false);
    });

    it('should prevent overselling', () => {
      inventory.restock(100);
      inventory.reserve(80);

      // Can't reserve more than available
      expect(() => inventory.reserve(30)).toThrow();

      // Can't outbound more than available
      expect(() => inventory.outbound(30)).toThrow();
    });

    it('should track multiple reserves and unreserves', () => {
      inventory.restock(200);

      inventory.reserve(50);
      inventory.reserve(30);
      inventory.reserve(20);
      expect(inventory.reservedQuantity).toBe(100);
      expect(inventory.getAvailableQuantity()).toBe(100);

      inventory.unreserve(50);
      expect(inventory.reservedQuantity).toBe(50);
      expect(inventory.getAvailableQuantity()).toBe(150);
    });
  });
});
