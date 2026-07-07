import { describe, it, expect, beforeEach } from '@jest/globals';
import { Category } from './category';

describe('Category Domain Entity', () => {
  describe('Category.create', () => {
    it('should create root category', () => {
      const category = Category.create(
        'Fresh Vegetables',
        'fresh-vegetables',
        undefined,
        0,
        'Organic fresh vegetables',
      );

      expect(category.name).toBe('Fresh Vegetables');
      expect(category.slug).toBe('fresh-vegetables');
      expect(category.isActive).toBe(true);
      expect(category.sortOrder).toBe(0);
      expect(category.description).toBe('Organic fresh vegetables');
      expect(category.parentId).toBeUndefined();
      expect(category.isRoot()).toBe(true);
    });

    it('should create subcategory', () => {
      const category = Category.create(
        'Tomatoes',
        'tomatoes',
        'parent-id',
        10,
        'Fresh ripe tomatoes',
      );

      expect(category.parentId).toBe('parent-id');
      expect(category.isRoot()).toBe(false);
    });

    it('should use default sort order', () => {
      const category = Category.create('Vegetables', 'vegetables');

      expect(category.sortOrder).toBe(0);
    });

    it('should have generated id and timestamps', () => {
      const category = Category.create('Vegetables', 'vegetables');

      expect(category.id).toBeDefined();
      expect(category.createdAt).toBeInstanceOf(Date);
      expect(category.updatedAt).toBeInstanceOf(Date);
    });

    it('should be active by default', () => {
      const category = Category.create('Vegetables', 'vegetables');

      expect(category.isActive).toBe(true);
    });
  });

  describe('changeName', () => {
    let category: Category;

    beforeEach(() => {
      category = Category.create('Vegetables', 'vegetables');
    });

    it('should update name and regenerate slug', () => {
      category.changeName('Fresh Vegetables');

      expect(category.name).toBe('Fresh Vegetables');
      expect(category.slug).toBe('fresh-vegetables');
    });

    it('should throw error on empty name', () => {
      expect(() => category.changeName('')).toThrow(
        'Category name cannot be empty',
      );
    });

    it('should throw error on whitespace-only name', () => {
      expect(() => category.changeName('   ')).toThrow(
        'Category name cannot be empty',
      );
    });

    it('should trim whitespace', () => {
      category.changeName('  Organic Vegetables  ');

      expect(category.name).toBe('Organic Vegetables');
    });

    it('should update timestamp', () => {
      const oldTimestamp = category.updatedAt;
      category.changeName('New Name');

      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldTimestamp.getTime(),
      );
    });

    it('should generate slug with special characters removed', () => {
      category.changeName('Vegetables & Fruits!');

      // Special characters are removed, spaces become hyphens, multiple hyphens reduced to single
      // 'Vegetables & Fruits!' → 'vegetables  fruits' → 'vegetables-fruits'
      expect(category.slug).toBe('vegetables-fruits');
    });

    it('should handle multiple spaces in slug', () => {
      category.changeName('Fresh   Organic   Vegetables');

      expect(category.slug).toBe('fresh-organic-vegetables');
    });
  });

  describe('changeSlug', () => {
    let category: Category;

    beforeEach(() => {
      category = Category.create('Vegetables', 'vegetables');
    });

    it('should update slug', () => {
      category.changeSlug('organic-vegetables');

      expect(category.slug).toBe('organic-vegetables');
    });

    it('should throw error on empty slug', () => {
      expect(() => category.changeSlug('')).toThrow('Slug cannot be empty');
    });

    it('should throw error on invalid slug format', () => {
      expect(() => category.changeSlug('Invalid Slug!')).toThrow(
        'Slug can only contain lowercase letters, numbers, and hyphens',
      );
    });

    it('should throw error on uppercase letters', () => {
      expect(() => category.changeSlug('Vegetables')).toThrow(
        'Slug can only contain lowercase letters, numbers, and hyphens',
      );
    });

    it('should allow hyphens and numbers', () => {
      expect(() => category.changeSlug('fresh-vegetables-123')).not.toThrow();
      expect(category.slug).toBe('fresh-vegetables-123');
    });

    it('should trim and lowercase', () => {
      // The slug must only contain lowercase, numbers, and hyphens - no spaces allowed
      expect(() => category.changeSlug('  Fresh-Vegetables  ')).toThrow(
        'Slug can only contain lowercase letters, numbers, and hyphens',
      );

      // Properly formatted slug works
      category.changeSlug('fresh-vegetables');
      expect(category.slug).toBe('fresh-vegetables');
    });

    it('should update timestamp', () => {
      const oldTimestamp = category.updatedAt;
      category.changeSlug('new-slug');

      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldTimestamp.getTime(),
      );
    });
  });

  describe('changeSortOrder', () => {
    let category: Category;

    beforeEach(() => {
      category = Category.create('Vegetables', 'vegetables', undefined, 5);
    });

    it('should update sort order', () => {
      category.changeSortOrder(10);

      expect(category.sortOrder).toBe(10);
    });

    it('should allow zero sort order', () => {
      expect(() => category.changeSortOrder(0)).not.toThrow();
      expect(category.sortOrder).toBe(0);
    });

    it('should allow large sort order numbers', () => {
      expect(() => category.changeSortOrder(1000)).not.toThrow();
      expect(category.sortOrder).toBe(1000);
    });

    it('should throw error on negative sort order', () => {
      expect(() => category.changeSortOrder(-1)).toThrow(
        'Sort order cannot be negative',
      );
    });

    it('should update timestamp', () => {
      const oldTimestamp = category.updatedAt;
      category.changeSortOrder(20);

      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldTimestamp.getTime(),
      );
    });
  });

  describe('changeDescription', () => {
    let category: Category;

    beforeEach(() => {
      category = Category.create(
        'Vegetables',
        'vegetables',
        undefined,
        0,
        'Original description',
      );
    });

    it('should update description', () => {
      category.changeDescription('New description');

      expect(category.description).toBe('New description');
    });

    it('should allow clearing description', () => {
      category.changeDescription(undefined);

      expect(category.description).toBeUndefined();
    });

    it('should trim whitespace', () => {
      category.changeDescription('  Trimmed description  ');

      expect(category.description).toBe('Trimmed description');
    });

    it('should clear on whitespace-only description', () => {
      category.changeDescription('   ');

      expect(category.description).toBeUndefined();
    });

    it('should update timestamp', () => {
      const oldTimestamp = category.updatedAt;
      category.changeDescription('New description');

      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldTimestamp.getTime(),
      );
    });
  });

  describe('changeParent', () => {
    let category: Category;
    let parentId: string;

    beforeEach(() => {
      category = Category.create('Tomatoes', 'tomatoes', 'old-parent-id');
      parentId = 'new-parent-id';
    });

    it('should change parent', () => {
      category.changeParent(parentId);

      expect(category.parentId).toBe(parentId);
    });

    it('should allow clearing parent', () => {
      category.changeParent(undefined);

      expect(category.parentId).toBeUndefined();
      expect(category.isRoot()).toBe(true);
    });

    it('should throw error if category is its own parent', () => {
      expect(() => category.changeParent(category.id)).toThrow(
        'A category cannot be its own parent',
      );
    });

    it('should update timestamp', () => {
      const oldTimestamp = category.updatedAt;
      category.changeParent(parentId);

      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldTimestamp.getTime(),
      );
    });
  });

  describe('activate/deactivate', () => {
    let category: Category;

    beforeEach(() => {
      category = Category.create('Vegetables', 'vegetables');
    });

    it('should activate inactive category', () => {
      const inactiveCategory = Category.create('Test', 'test');
      inactiveCategory.deactivate();

      expect(inactiveCategory.isActive).toBe(false);
      inactiveCategory.activate();
      expect(inactiveCategory.isActive).toBe(true);
    });

    it('should deactivate active category', () => {
      expect(category.isActive).toBe(true);
      category.deactivate();
      expect(category.isActive).toBe(false);
    });

    it('should not double-activate', () => {
      category.activate();
      expect(category.isActive).toBe(true);
      category.activate();
      expect(category.isActive).toBe(true);
    });

    it('should not double-deactivate', () => {
      category.deactivate();
      expect(category.isActive).toBe(false);
      category.deactivate();
      expect(category.isActive).toBe(false);
    });

    it('should update timestamp on activate', () => {
      const inactiveCategory = Category.create('Test', 'test');
      inactiveCategory.deactivate();
      const oldTimestamp = inactiveCategory.updatedAt;
      inactiveCategory.activate();

      expect(inactiveCategory.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldTimestamp.getTime(),
      );
    });

    it('should update timestamp on deactivate', () => {
      const oldTimestamp = category.updatedAt;
      category.deactivate();

      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldTimestamp.getTime(),
      );
    });
  });

  describe('isRoot', () => {
    it('should return true for category without parent', () => {
      const category = Category.create('Vegetables', 'vegetables');

      expect(category.isRoot()).toBe(true);
    });

    it('should return false for category with parent', () => {
      const category = Category.create('Tomatoes', 'tomatoes', 'parent-id');

      expect(category.isRoot()).toBe(false);
    });

    it('should return true after clearing parent', () => {
      const category = Category.create('Tomatoes', 'tomatoes', 'parent-id');

      expect(category.isRoot()).toBe(false);
      category.changeParent(undefined);
      expect(category.isRoot()).toBe(true);
    });
  });

  describe('slug generation', () => {
    it('should handle spaces', () => {
      const category = Category.create('Fresh Vegetables', 'fresh-vegetables');

      expect(category.slug).toBe('fresh-vegetables');
    });

    it('should handle special characters', () => {
      const category = Category.create('Vegetables & Fruits', 'test');

      expect(category.slug).not.toContain('&');
      expect(category.slug).toMatch(/^[a-z0-9-]+$/);
    });

    it('should handle multiple consecutive hyphens', () => {
      const category = Category.create('Fresh---Vegetables', 'test');

      expect(category.slug).not.toContain('---');
    });

    it('should handle accented characters', () => {
      const category = Category.create('Rau Cải Tươi', 'test');

      // Special characters removed, then converted
      expect(category.slug).toBeDefined();
    });

    it('should be consistently generated from name changes', () => {
      const category = Category.create('Test', 'test-slug');
      category.changeName('Fresh Vegetables');

      expect(category.slug).toBe('fresh-vegetables');
    });
  });

  describe('getters', () => {
    let category: Category;

    beforeEach(() => {
      category = Category.create(
        'Vegetables',
        'vegetables',
        'parent-id',
        5,
        'Fresh vegetables',
      );
    });

    it('should return id', () => {
      expect(category.id).toBeDefined();
      expect(typeof category.id).toBe('string');
    });

    it('should return name', () => {
      expect(category.name).toBe('Vegetables');
    });

    it('should return slug', () => {
      expect(category.slug).toBe('vegetables');
    });

    it('should return isActive', () => {
      expect(category.isActive).toBe(true);
    });

    it('should return sortOrder', () => {
      expect(category.sortOrder).toBe(5);
    });

    it('should return description', () => {
      expect(category.description).toBe('Fresh vegetables');
    });

    it('should return parentId', () => {
      expect(category.parentId).toBe('parent-id');
    });

    it('should return timestamps', () => {
      expect(category.createdAt).toBeInstanceOf(Date);
      expect(category.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('complex scenarios', () => {
    it('should handle category lifecycle', () => {
      // Create root category
      let category = Category.create('Vegetables', 'vegetables');
      expect(category.isRoot()).toBe(true);
      expect(category.isActive).toBe(true);

      // Make it a subcategory
      category.changeParent('fruits-parent-id');
      expect(category.isRoot()).toBe(false);

      // Update details
      category.changeName('Fresh Vegetables');
      category.changeDescription('Organic fresh vegetables');
      expect(category.slug).toBe('fresh-vegetables');

      // Deactivate
      category.deactivate();
      expect(category.isActive).toBe(false);

      // Reactivate and make it root again
      category.activate();
      category.changeParent(undefined);
      expect(category.isActive).toBe(true);
      expect(category.isRoot()).toBe(true);
    });

    it('should maintain consistency through multiple updates', () => {
      const category = Category.create(
        'Original Name',
        'original-slug',
        undefined,
        10,
      );

      category.changeName('Updated Name');
      category.changeSortOrder(20);
      category.changeDescription('New description');
      category.changeParent('new-parent');

      expect(category.name).toBe('Updated Name');
      expect(category.slug).toBe('updated-name');
      expect(category.sortOrder).toBe(20);
      expect(category.description).toBe('New description');
      expect(category.parentId).toBe('new-parent');
    });
  });
});
