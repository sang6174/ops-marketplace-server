import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from '@jest/globals';
import { Shop } from './shop';

describe('Shop Domain Entity', () => {
  let shop: Shop;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    shop = Shop.create({
      ownerId: 'owner-123',
      name: 'Green Farm Store',
      description: 'Fresh organic vegetables',
    });
  });

  describe('create', () => {
    it('should create shop with required fields', () => {
      const newShop = Shop.create({
        ownerId: 'owner-456',
        name: 'Sunrise Bakery',
      });

      expect(newShop.id).toBeDefined();
      expect(newShop.ownerId).toBe('owner-456');
      expect(newShop.name).toBe('Sunrise Bakery');
      expect(newShop.description).toBeNull();
      expect(newShop.createdAt).toBeInstanceOf(Date);
      expect(newShop.updatedAt).toBeInstanceOf(Date);
      expect(newShop.deletedAt).toBeNull();
    });

    it('should create shop with description when provided', () => {
      const newShop = Shop.create({
        ownerId: 'owner-789',
        name: 'Tech Gadgets',
        description: 'Latest tech products',
      });

      expect(newShop.description).toBe('Latest tech products');
    });

    it('should generate unique UUID for each shop', () => {
      const shop1 = Shop.create({ ownerId: 'owner-1', name: 'Shop 1' });
      const shop2 = Shop.create({ ownerId: 'owner-2', name: 'Shop 2' });

      expect(shop1.id).not.toBe(shop2.id);
    });
  });

  describe('getters', () => {
    it('should return name', () => {
      expect(shop.name).toBe('Green Farm Store');
    });

    it('should return description', () => {
      expect(shop.description).toBe('Fresh organic vegetables');
    });

    it('should return updatedAt', () => {
      expect(shop.updatedAt).toBeInstanceOf(Date);
    });

    it('should return deletedAt as null initially', () => {
      expect(shop.deletedAt).toBeNull();
    });
  });

  describe('updateInfo', () => {
    it('should update name and description', () => {
      const oldUpdatedAt = shop.updatedAt;
      jest.advanceTimersByTime(1);
      shop.updateInfo('Organic Farm Store', 'Premium organic produce');

      expect(shop.name).toBe('Organic Farm Store');
      expect(shop.description).toBe('Premium organic produce');
      expect(shop.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    });

    it('should update name and clear description when description is not provided', () => {
      const oldUpdatedAt = shop.updatedAt;
      jest.advanceTimersByTime(1);
      shop.updateInfo('Updated Store');

      expect(shop.name).toBe('Updated Store');
      expect(shop.description).toBeNull();
      expect(shop.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    });

    it('should update name and set description to null when description is empty string', () => {
      jest.advanceTimersByTime(1);
      shop.updateInfo('New Name', '');

      expect(shop.name).toBe('New Name');
      expect(shop.description).toBeNull();
    });

    it('should update description to provided value', () => {
      jest.advanceTimersByTime(1);
      shop.updateInfo('New Name', 'New description');

      expect(shop.name).toBe('New Name');
      expect(shop.description).toBe('New description');
    });
  });

  describe('softDelete', () => {
    it('should mark shop as deleted with timestamp', () => {
      const oldUpdatedAt = shop.updatedAt;
      expect(shop.deletedAt).toBeNull();

      jest.advanceTimersByTime(1);
      shop.softDelete();

      expect(shop.deletedAt).toBeInstanceOf(Date);
      expect(shop.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    });

    it('should not change deletedAt if already deleted', () => {
      shop.softDelete();
      const firstDeletedAt = shop.deletedAt;
      const firstUpdatedAt = shop.updatedAt;

      jest.advanceTimersByTime(1);
      shop.softDelete();

      expect(shop.deletedAt).toEqual(firstDeletedAt);
      expect(shop.updatedAt).toEqual(firstUpdatedAt);
    });

    it('should update updatedAt on softDelete', () => {
      const oldUpdatedAt = shop.updatedAt;
      jest.advanceTimersByTime(1);
      shop.softDelete();
      expect(shop.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    });
  });

  describe('equals', () => {
    it('should return true for same instance', () => {
      expect(shop.equals(shop)).toBe(true);
    });

    it('should return false for different shop', () => {
      const otherShop = Shop.create({
        ownerId: 'other-owner',
        name: 'Other Shop',
      });
      expect(shop.equals(otherShop)).toBe(false);
    });

    it('should return false for non-Shop object', () => {
      expect(shop.equals(null as any)).toBe(false);
      expect(shop.equals({} as any)).toBe(false);
      expect(shop.equals(undefined as any)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should allow name update with empty string', () => {
      jest.advanceTimersByTime(1);
      shop.updateInfo('');
      expect(shop.name).toBe('');
    });

    it('should handle extremely long name', () => {
      const longName = 'a'.repeat(1000);
      jest.advanceTimersByTime(1);
      shop.updateInfo(longName);
      expect(shop.name).toBe(longName);
    });

    it('should handle special characters in name and description', () => {
      jest.advanceTimersByTime(1);
      shop.updateInfo('Shop!@#$%^&*()', 'Description with < > & "');
      expect(shop.name).toBe('Shop!@#$%^&*()');
      expect(shop.description).toBe('Description with < > & "');
    });
  });

  describe('timestamp behavior', () => {
    it('should update updatedAt on every mutation', () => {
      const oldUpdatedAt = shop.updatedAt;
      jest.advanceTimersByTime(1);
      shop.updateInfo('New Name');
      expect(shop.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());

      const midUpdatedAt = shop.updatedAt;
      jest.advanceTimersByTime(1);
      shop.softDelete();
      expect(shop.updatedAt.getTime()).toBeGreaterThan(midUpdatedAt.getTime());
    });

    it('should not update updatedAt when softDelete called multiple times', () => {
      shop.softDelete();
      const firstUpdatedAt = shop.updatedAt;
      jest.advanceTimersByTime(1);
      shop.softDelete();
      expect(shop.updatedAt.getTime()).toBe(firstUpdatedAt.getTime());
    });
  });
});
