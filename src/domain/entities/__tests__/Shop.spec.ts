import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Shop } from '../products/Shop';
import { ShopId } from '../../value-objects/ShopId';
import { UserId } from '../../value-objects/UserId';
import { ShopName } from '../../value-objects/ShopName';
import { ShopDescription } from '../../value-objects/ShopDescription';
import {
  ShopCreated,
  ShopUpdated,
  ShopSoftDeleted,
} from '../../events/ShopEvents';

describe('Shop Aggregate', () => {
  let shop: Shop;
  const fixedId = ShopId.generate();
  const ownerId = UserId.generate();
  const shopName = ShopName.create('My Shop');
  const shopDesc = ShopDescription.create('A great shop');
  const fixedDate = new Date('2025-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('017fe537-bb13-7c35-b52a-cb5490cce7be');

    shop = Shop.create({
      id: fixedId,
      ownerId,
      name: shopName,
      description: shopDesc,
      createdAt: fixedDate,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('should create shop with all given values', () => {
      expect(shop.id).toBe(fixedId);
      expect(shop.ownerId).toBe(ownerId);
      expect(shop.name).toBe(shopName);
      expect(shop.description).toBe(shopDesc);
      expect(shop.createdAt).toBe(fixedDate);
      expect(shop.updatedAt).toBe(fixedDate);
      expect(shop.deletedAt).toBeNull();
      expect(shop.isDeleted()).toBe(false);
      expect(shop.events[0]).toBeInstanceOf(ShopCreated);
    });

    it('should default description to empty if not provided', () => {
      const shop2 = Shop.create({
        id: ShopId.generate(),
        ownerId,
        name: ShopName.create('Shop 2'),
      });
      expect(shop2.description).toEqual(ShopDescription.create());
    });
  });

  describe('reconstitute', () => {
    it('should recreate shop from persistence', () => {
      const reconstituted = Shop.reconstitute({
        id: fixedId,
        ownerId,
        name: ShopName.create('Reconstituted Shop'),
        description: ShopDescription.create('Reconstituted desc'),
        createdAt: fixedDate,
        updatedAt: new Date('2025-02-01'),
        deletedAt: null,
      });
      expect(reconstituted.id).toBe(fixedId);
      expect(reconstituted.name.value).toBe('Reconstituted Shop');
      expect(reconstituted.updatedAt).toEqual(new Date('2025-02-01'));
      expect(reconstituted.deletedAt).toBeNull();
      expect(reconstituted.events).toHaveLength(0);
    });
  });

  describe('updateInfo', () => {
    it('should update name and description and emit event', () => {
      const newName = ShopName.create('New Shop Name');
      const newDesc = ShopDescription.create('New description');
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      shop.updateInfo(newName, newDesc, newDate);

      expect(shop.name).toBe(newName);
      expect(shop.description).toBe(newDesc);
      expect(shop.updatedAt).toBe(newDate);
      expect(shop.events[1]).toBeInstanceOf(ShopUpdated);
    });

    it('should keep description if not provided', () => {
      const newName = ShopName.create('New Name');
      shop.updateInfo(newName);
      expect(shop.name).toBe(newName);
      expect(shop.description).toBe(shopDesc);
    });

    it('should throw if shop is deleted', () => {
      shop.softDelete();
      expect(() => shop.updateInfo(ShopName.create('New Name'))).toThrow(
        'Cannot update a deleted shop',
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete shop and emit event', () => {
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      shop.softDelete(newDate);

      expect(shop.isDeleted()).toBe(true);
      expect(shop.deletedAt).toBe(newDate);
      expect(shop.updatedAt).toBe(newDate);
      expect(shop.events[1]).toBeInstanceOf(ShopSoftDeleted);
    });

    it('should do nothing if already deleted', () => {
      shop.softDelete();
      const eventsCount = shop.events.length;
      shop.softDelete();
      expect(shop.events).toHaveLength(eventsCount);
    });
  });

  describe('clearEvents', () => {
    it('should clear all events', () => {
      shop.updateInfo(ShopName.create('New'));
      expect(shop.events).toHaveLength(2);
      shop.clearEvents();
      expect(shop.events).toHaveLength(0);
    });
  });

  describe('equals', () => {
    it('should return true for same id', () => {
      const same = Shop.reconstitute({
        id: fixedId,
        ownerId,
        name: ShopName.create('Different'),
        description: ShopDescription.create('Different'),
        createdAt: fixedDate,
        updatedAt: fixedDate,
        deletedAt: null,
      });
      expect(shop.equals(same)).toBe(true);
    });

    it('should return false for different id', () => {
      const different = Shop.create({
        id: ShopId.generate(),
        ownerId,
        name: ShopName.create('Other'),
      });
      expect(shop.equals(different)).toBe(false);
    });
  });
});
