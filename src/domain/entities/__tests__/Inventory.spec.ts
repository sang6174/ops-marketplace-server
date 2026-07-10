// domain/entities/__tests__/Inventory.spec.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Inventory } from '../../entities/products/inventory';
import { InventoryId } from '../../value-objects/InventoryId';
import { ProductId } from '../../value-objects/ProductId';
import { Quantity } from '../../value-objects/Quantity';
import { MinStockThreshold } from '../../value-objects/MinStockThreshold';
import { LowStockSpecification } from '../../specifications/InventorySpecifications';
import {
  StockRestocked,
  StockReserved,
  StockUnreserved,
  StockReduced,
  MinThresholdChanged,
} from '../../events/InventoryEvents';

const createMockInventory = (
  overrides?: Partial<{
    id: InventoryId;
    productId: ProductId;
    quantity: Quantity;
    reserved: Quantity;
    minThreshold: MinStockThreshold;
    lastRestockedAt: Date;
    updatedAt: Date;
  }>,
) => {
  const defaultId = InventoryId.generate();
  const defaultProductId = ProductId.generate();
  const defaultQuantity = Quantity.fromNumber(100);
  const defaultReserved = Quantity.fromNumber(10);
  const defaultThreshold = MinStockThreshold.fromNumber(20);
  const defaultDate = new Date('2025-01-01T00:00:00.000Z');

  return {
    id: overrides?.id ?? defaultId,
    productId: overrides?.productId ?? defaultProductId,
    quantity: overrides?.quantity ?? defaultQuantity,
    reserved: overrides?.reserved ?? defaultReserved,
    minThreshold: overrides?.minThreshold ?? defaultThreshold,
    lastRestockedAt: overrides?.lastRestockedAt ?? defaultDate,
    updatedAt: overrides?.updatedAt ?? defaultDate,
  };
};

describe('Inventory Aggregate', () => {
  let inventory: Inventory;
  const fixedId = InventoryId.generate();
  const productId = ProductId.generate();
  const fixedDate = new Date('2025-01-01T00:00:00.000Z');
  const fixedThreshold = MinStockThreshold.fromNumber(20);
  const initialQuantity = Quantity.fromNumber(100);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    inventory = Inventory.create({
      id: fixedId,
      productId,
      minThreshold: fixedThreshold,
      initialQuantity,
      createdAt: fixedDate,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create()', () => {
    it('should create inventory with given values', () => {
      expect(inventory.id).toBe(fixedId);
      expect(inventory.productId).toBe(productId);
      expect(inventory.quantity).toEqual(initialQuantity);
      expect(inventory.reserved).toEqual(Quantity.zero());
      expect(inventory.minStockThreshold).toEqual(fixedThreshold);
      expect(inventory.lastRestockedAt).toBe(fixedDate);
      expect(inventory.updatedAt).toBe(fixedDate);
      expect(inventory.events).toHaveLength(0);
    });

    it('should use default values when optional params omitted', () => {
      const defaultInventory = Inventory.create({
        id: InventoryId.generate(),
        productId: ProductId.generate(),
      });
      expect(defaultInventory.quantity).toEqual(Quantity.zero());
      expect(defaultInventory.reserved).toEqual(Quantity.zero());
      expect(defaultInventory.minStockThreshold).toEqual(
        MinStockThreshold.fromNumber(10),
      );
      expect(defaultInventory.lastRestockedAt).toBe(fixedDate);
      expect(defaultInventory.updatedAt).toBe(fixedDate);
    });

    it('should accept custom minThreshold', () => {
      const custom = Inventory.create({
        id: InventoryId.generate(),
        productId: ProductId.generate(),
        minThreshold: MinStockThreshold.fromNumber(50),
      });
      expect(custom.minStockThreshold).toEqual(
        MinStockThreshold.fromNumber(50),
      );
    });
  });

  describe('reconstitute()', () => {
    it('should recreate inventory from persistence data', () => {
      const props = createMockInventory({
        id: fixedId,
        productId,
        quantity: Quantity.fromNumber(200),
        reserved: Quantity.fromNumber(30),
        minThreshold: MinStockThreshold.fromNumber(15),
        lastRestockedAt: new Date('2024-12-31'),
        updatedAt: new Date('2025-01-02'),
      });

      const reconstituted = Inventory.reconstitute(props);

      expect(reconstituted.id).toBe(props.id);
      expect(reconstituted.productId).toBe(props.productId);
      expect(reconstituted.quantity).toBe(props.quantity);
      expect(reconstituted.reserved).toBe(props.reserved);
      expect(reconstituted.minStockThreshold).toBe(props.minThreshold);
      expect(reconstituted.lastRestockedAt).toBe(props.lastRestockedAt);
      expect(reconstituted.updatedAt).toBe(props.updatedAt);
      expect(reconstituted.events).toHaveLength(0);
    });
  });

  // ===== Getters =====
  describe('getters', () => {
    it('should return correct values', () => {
      expect(inventory.id).toBe(fixedId);
      expect(inventory.productId).toBe(productId);
      expect(inventory.quantity).toBe(initialQuantity);
      expect(inventory.reserved).toEqual(Quantity.zero());
      expect(inventory.minStockThreshold).toBe(fixedThreshold);
      expect(inventory.lastRestockedAt).toBe(fixedDate);
      expect(inventory.updatedAt).toBe(fixedDate);
    });
  });

  describe('restock()', () => {
    it('should increase quantity and update timestamps', () => {
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      const restockQty = Quantity.fromNumber(50);
      inventory.restock(restockQty);

      expect(inventory.quantity).toEqual(Quantity.fromNumber(150));
      expect(inventory.lastRestockedAt).toBe(newDate);
      expect(inventory.updatedAt).toBe(newDate);
    });

    it('should emit StockRestocked event', () => {
      const restockQty = Quantity.fromNumber(50);
      inventory.restock(restockQty);

      expect(inventory.events).toHaveLength(1);
      const event = inventory.events[0];
      expect(event).toBeInstanceOf(StockRestocked);
      expect(event.inventoryId).toBe(fixedId);
      expect(event.productId).toBe(productId);
      expect(event.quantity).toEqual(restockQty);
      expect(event.newTotal).toEqual(Quantity.fromNumber(150));
      expect(event.timestamp).toBe(fixedDate);
    });

    it('should throw error if quantity <= 0', () => {
      expect(() => inventory.restock(Quantity.fromNumber(0))).toThrow(
        'Restock quantity must be > 0',
      );
      expect(() => inventory.restock(Quantity.fromNumber(-5))).toThrow(
        'Quantity cannot be negative',
      );
    });
  });

  describe('reserve()', () => {
    it('should increase reserved quantity and update updatedAt', () => {
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      const reserveQty = Quantity.fromNumber(20);
      inventory.reserve(reserveQty);

      expect(inventory.reserved).toEqual(Quantity.fromNumber(20));
      expect(inventory.updatedAt).toBe(newDate);
    });

    it('should emit StockReserved event', () => {
      const reserveQty = Quantity.fromNumber(20);
      inventory.reserve(reserveQty);

      expect(inventory.events).toHaveLength(1);
      const event = inventory.events[0];
      expect(event).toBeInstanceOf(StockReserved);
      expect(event.quantity).toEqual(reserveQty);
      expect(event.newReserved).toEqual(Quantity.fromNumber(20));
    });

    it('should throw error if not enough available stock', () => {
      const tooMuch = Quantity.fromNumber(200);
      expect(() => inventory.reserve(tooMuch)).toThrow(
        'Not enough stock to reserve. Available: 100, Requested: 200',
      );
    });

    it('should throw error if quantity <= 0', () => {
      expect(() => inventory.reserve(Quantity.fromNumber(0))).toThrow(
        'Reserve quantity must be > 0',
      );
    });

    it('should respect existing reserved quantity', () => {
      inventory.reserve(Quantity.fromNumber(30));
      expect(inventory.reserved).toEqual(Quantity.fromNumber(30));
      inventory.reserve(Quantity.fromNumber(70));
      expect(inventory.reserved).toEqual(Quantity.fromNumber(100));
      expect(inventory.quantity).toEqual(Quantity.fromNumber(100));
      expect(() => inventory.reserve(Quantity.fromNumber(1))).toThrow(
        'Not enough stock to reserve. Available: 0, Requested: 1',
      );
    });
  });

  describe('unreserve()', () => {
    beforeEach(() => {
      inventory.reserve(Quantity.fromNumber(30));
    });

    it('should decrease reserved quantity and update updatedAt', () => {
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      inventory.unreserve(Quantity.fromNumber(10));
      expect(inventory.reserved).toEqual(Quantity.fromNumber(20));
      expect(inventory.updatedAt).toBe(newDate);
    });

    it('should emit StockUnreserved event', () => {
      inventory.unreserve(Quantity.fromNumber(10));
      expect(inventory.events).toHaveLength(2);
      const event = inventory.events[1];
      expect(event).toBeInstanceOf(StockUnreserved);
      expect(event.quantity).toEqual(Quantity.fromNumber(10));
      expect(event.newReserved).toEqual(Quantity.fromNumber(20));
    });

    it('should throw error if unreserve more than reserved', () => {
      expect(() => inventory.unreserve(Quantity.fromNumber(50))).toThrow(
        'Cannot unreserve more than reserved. Reserved: 30, Requested: 50',
      );
    });

    it('should throw error if quantity <= 0', () => {
      expect(() => inventory.unreserve(Quantity.fromNumber(0))).toThrow(
        'Unreserve quantity must be > 0',
      );
    });

    it('should allow unreserve all', () => {
      inventory.unreserve(Quantity.fromNumber(30));
      expect(inventory.reserved).toEqual(Quantity.zero());
    });
  });

  describe('outbound()', () => {
    it('should decrease quantity and update updatedAt', () => {
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      inventory.outbound(Quantity.fromNumber(30));
      expect(inventory.quantity).toEqual(Quantity.fromNumber(70));
      expect(inventory.updatedAt).toBe(newDate);
    });

    it('should emit StockReduced event', () => {
      inventory.outbound(Quantity.fromNumber(30));
      expect(inventory.events).toHaveLength(1);
      const event = inventory.events[0];
      expect(event).toBeInstanceOf(StockReduced);
      expect(event.quantity).toEqual(Quantity.fromNumber(30));
      expect(event.newTotal).toEqual(Quantity.fromNumber(70));
    });

    it('should reduce reserved first when outbound', () => {
      inventory.reserve(Quantity.fromNumber(20));
      inventory.outbound(Quantity.fromNumber(15));
      expect(inventory.quantity).toEqual(Quantity.fromNumber(85));
      expect(inventory.reserved).toEqual(Quantity.fromNumber(5)); // 20 - 15 = 5
    });

    it('should reduce reserved completely and then total stock', () => {
      inventory.reserve(Quantity.fromNumber(20));
      inventory.outbound(Quantity.fromNumber(25));
      expect(inventory.quantity).toEqual(Quantity.fromNumber(75));
      expect(inventory.reserved).toEqual(Quantity.zero());
    });

    it('should throw error if not enough available stock', () => {
      expect(() => inventory.outbound(Quantity.fromNumber(200))).toThrow(
        'Not enough available stock. Available: 100, Requested: 200',
      );
    });

    it('should throw error if quantity <= 0', () => {
      expect(() => inventory.outbound(Quantity.fromNumber(0))).toThrow(
        'Outbound quantity must be > 0',
      );
    });
  });

  describe('updateMinThreshold()', () => {
    it('should update min threshold and updatedAt', () => {
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      const newThreshold = MinStockThreshold.fromNumber(50);
      inventory.updateMinThreshold(newThreshold);

      expect(inventory.minStockThreshold).toBe(newThreshold);
      expect(inventory.updatedAt).toBe(newDate);
    });

    it('should emit MinThresholdChanged event', () => {
      const newThreshold = MinStockThreshold.fromNumber(50);
      inventory.updateMinThreshold(newThreshold);
      expect(inventory.events).toHaveLength(1);
      const event = inventory.events[0];
      expect(event).toBeInstanceOf(MinThresholdChanged);
      expect(event.oldThreshold).toBe(20);
      expect(event.newThreshold).toBe(50);
    });

    it('should allow same threshold (no change)', () => {
      inventory.updateMinThreshold(MinStockThreshold.fromNumber(20));
      expect(inventory.events).toHaveLength(1);
      const event = inventory.events[0];
      expect(event.oldThreshold).toBe(20);
      expect(event.newThreshold).toBe(20);
    });
  });

  describe('getAvailableQuantity()', () => {
    it('should return available stock (total - reserved)', () => {
      expect(inventory.getAvailableQuantity()).toBe(100);
      inventory.reserve(Quantity.fromNumber(30));
      expect(inventory.getAvailableQuantity()).toBe(70);
      inventory.outbound(Quantity.fromNumber(20));
      expect(inventory.getAvailableQuantity()).toBe(50);
    });
  });

  describe('checkLowStock()', () => {
    it('should return true if stock below threshold percent', () => {
      const spec = new LowStockSpecification(100);
      expect(inventory.checkLowStock(spec)).toBe(false); // 100 >= 20

      inventory.outbound(Quantity.fromNumber(90)); // còn 10
      expect(inventory.checkLowStock(spec)).toBe(true); // 10 < 20
    });

    it('should work with custom threshold percent', () => {
      const spec = new LowStockSpecification(50); // 50% of threshold = 10
      expect(inventory.checkLowStock(spec)).toBe(false); // 100 >= 10

      inventory.outbound(Quantity.fromNumber(95)); // còn 5
      expect(inventory.checkLowStock(spec)).toBe(true); // 5 < 10
    });

    it('should consider reserved quantity', () => {
      const spec = new LowStockSpecification(100);
      inventory.reserve(Quantity.fromNumber(90)); // available = 10
      expect(inventory.checkLowStock(spec)).toBe(true); // 10 < 20
    });
  });

  describe('clearEvents()', () => {
    it('should clear all events', () => {
      inventory.restock(Quantity.fromNumber(10));
      inventory.reserve(Quantity.fromNumber(5));
      expect(inventory.events).toHaveLength(2);
      inventory.clearEvents();
      expect(inventory.events).toHaveLength(0);
    });
  });

  describe('equals()', () => {
    it('should return true for same id', () => {
      const same = Inventory.reconstitute({
        id: fixedId,
        productId: ProductId.generate(),
        quantity: Quantity.zero(),
        reserved: Quantity.zero(),
        minThreshold: MinStockThreshold.fromNumber(10),
        lastRestockedAt: fixedDate,
        updatedAt: fixedDate,
      });
      expect(inventory.equals(same)).toBe(true);
    });

    it('should return false for different id', () => {
      const different = Inventory.create({
        id: InventoryId.generate(),
        productId: ProductId.generate(),
      });
      expect(inventory.equals(different)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple operations in sequence', () => {
      inventory.restock(Quantity.fromNumber(50));
      expect(inventory.quantity).toEqual(Quantity.fromNumber(150));

      inventory.reserve(Quantity.fromNumber(30));
      expect(inventory.reserved).toEqual(Quantity.fromNumber(30));

      inventory.outbound(Quantity.fromNumber(20));
      expect(inventory.quantity).toEqual(Quantity.fromNumber(130));
      expect(inventory.reserved).toEqual(Quantity.fromNumber(10));

      inventory.unreserve(Quantity.fromNumber(10));
      expect(inventory.reserved).toEqual(Quantity.zero());

      inventory.updateMinThreshold(MinStockThreshold.fromNumber(100));
      expect(inventory.minStockThreshold).toEqual(
        MinStockThreshold.fromNumber(100),
      );
    });

    it('should emit events in correct order', () => {
      inventory.restock(Quantity.fromNumber(10));
      inventory.reserve(Quantity.fromNumber(5));
      inventory.outbound(Quantity.fromNumber(3));
      inventory.unreserve(Quantity.fromNumber(2));
      inventory.updateMinThreshold(MinStockThreshold.fromNumber(30));

      expect(inventory.events).toHaveLength(5);
      expect(inventory.events[0]).toBeInstanceOf(StockRestocked);
      expect(inventory.events[1]).toBeInstanceOf(StockReserved);
      expect(inventory.events[2]).toBeInstanceOf(StockReduced);
      expect(inventory.events[3]).toBeInstanceOf(StockUnreserved);
      expect(inventory.events[4]).toBeInstanceOf(MinThresholdChanged);
    });

    it('should not allow negative quantity', () => {
      expect(() => Quantity.fromNumber(-1)).toThrow(
        'Quantity cannot be negative',
      );
    });

    it('should handle zero stock', () => {
      const zeroInventory = Inventory.create({
        id: InventoryId.generate(),
        productId: ProductId.generate(),
        initialQuantity: Quantity.zero(),
      });
      expect(zeroInventory.getAvailableQuantity()).toBe(0);
      expect(() => zeroInventory.outbound(Quantity.fromNumber(1))).toThrow(
        /Not enough available stock/,
      );
    });
  });
});
