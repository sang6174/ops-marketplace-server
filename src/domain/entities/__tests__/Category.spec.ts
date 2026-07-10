import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Category } from '../../entities/products/Category';
import { CategoryId } from '../../value-objects/CategoryId';
import { CategoryName } from '../../value-objects/CategoryName';
import { Slug } from '../../value-objects/Slug';
import { Description } from '../../value-objects/Description';
import { SortOrder } from '../../value-objects/SortOrder';
import {
  CategoryCreated,
  CategoryNameChanged,
  CategorySlugChanged,
  CategoryActivated,
  CategoryDeactivated,
  CategoryParentChanged,
} from '../../events/CategoryEvents';

describe('Category Aggregate', () => {
  let category: Category;
  const fixedId = CategoryId.generate();
  const fixedName = CategoryName.create('Fruits');
  const fixedSlug = Slug.create('fruits');
  const fixedDescription = Description.create('Fresh fruits category');
  const fixedSortOrder = SortOrder.fromNumber(1);
  const fixedParentId = CategoryId.generate();
  const fixedDate = new Date('2025-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    category = Category.create({
      id: fixedId,
      name: fixedName,
      slug: fixedSlug,
      parentId: null,
      sortOrder: fixedSortOrder,
      description: fixedDescription,
      isActive: true,
      createdAt: fixedDate,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create()', () => {
    it('should create category with all given values', () => {
      expect(category.id).toBe(fixedId);
      expect(category.name).toBe(fixedName);
      expect(category.slug).toBe(fixedSlug);
      expect(category.isActive).toBe(true);
      expect(category.sortOrder).toBe(fixedSortOrder);
      expect(category.description).toBe(fixedDescription);
      expect(category.parentId).toBeNull();
      expect(category.createdAt).toBe(fixedDate);
      expect(category.updatedAt).toBe(fixedDate);
    });

    it('should use default values when optional params omitted', () => {
      const defaultCategory = Category.create({
        id: CategoryId.generate(),
        name: CategoryName.create('Vegetables'),
      });
      expect(defaultCategory.isActive).toBe(true);
      expect(defaultCategory.sortOrder).toEqual(SortOrder.fromNumber(0));
      expect(defaultCategory.description).toEqual(Description.create());
      expect(defaultCategory.parentId).toBeNull();
      expect(defaultCategory.createdAt).toBe(fixedDate);
      expect(defaultCategory.updatedAt).toBe(fixedDate);
      expect(defaultCategory.slug).toEqual(Slug.create('vegetables'));
    });

    it('should generate slug from name if not provided', () => {
      const cat = Category.create({
        id: CategoryId.generate(),
        name: CategoryName.create('Organic Fruits & Veggies'),
      });
      expect(cat.slug).toEqual(Slug.create('organic-fruits-veggies'));
    });

    it('should accept custom slug', () => {
      const customSlug = Slug.create('custom-slug');
      const cat = Category.create({
        id: CategoryId.generate(),
        name: CategoryName.create('My Category'),
        slug: customSlug,
      });
      expect(cat.slug).toBe(customSlug);
    });

    it('should throw error if parentId equals self id', () => {
      expect(() => {
        Category.create({
          id: fixedId,
          name: CategoryName.create('Self'),
          parentId: fixedId,
        });
      }).toThrow('A category cannot be its own parent');
    });

    it('should emit CategoryCreated event', () => {
      expect(category.events).toHaveLength(1);
      const event = category.events[0];
      expect(event).toBeInstanceOf(CategoryCreated);
      expect(event.categoryId).toBe(fixedId);
      expect(event.name).toBe(fixedName);
      expect(event.slug).toBe(fixedSlug);
      expect(event.parentId).toBeNull();
      expect(event.timestamp).toBe(fixedDate);
    });
  });

  describe('reconstitute()', () => {
    it('should recreate category from persistence data', () => {
      const updatedAt = new Date('2025-02-01');
      const reconstituted = Category.reconstitute({
        id: fixedId,
        name: fixedName,
        slug: fixedSlug,
        isActive: false,
        sortOrder: SortOrder.fromNumber(5),
        description: Description.create('Reconstituted desc'),
        parentId: fixedParentId,
        createdAt: fixedDate,
        updatedAt,
      });
      expect(reconstituted.id).toBe(fixedId);
      expect(reconstituted.name).toBe(fixedName);
      expect(reconstituted.slug).toBe(fixedSlug);
      expect(reconstituted.isActive).toBe(false);
      expect(reconstituted.sortOrder).toEqual(SortOrder.fromNumber(5));
      expect(reconstituted.description).toEqual(
        Description.create('Reconstituted desc'),
      );
      expect(reconstituted.parentId).toBe(fixedParentId);
      expect(reconstituted.createdAt).toBe(fixedDate);
      expect(reconstituted.updatedAt).toBe(updatedAt);
      expect(reconstituted.events).toHaveLength(0);
    });
  });

  describe('getters', () => {
    it('should return correct values', () => {
      expect(category.id).toBe(fixedId);
      expect(category.name).toBe(fixedName);
      expect(category.slug).toBe(fixedSlug);
      expect(category.isActive).toBe(true);
      expect(category.sortOrder).toBe(fixedSortOrder);
      expect(category.description).toBe(fixedDescription);
      expect(category.parentId).toBeNull();
      expect(category.createdAt).toBe(fixedDate);
      expect(category.updatedAt).toBe(fixedDate);
    });
  });

  describe('changeName()', () => {
    it('should change name, auto-generate slug, and emit events', () => {
      const newName = CategoryName.create('Organic Fruits');
      const oldSlug = category.slug;
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      category.changeName(newName, newDate);

      expect(category.name).toBe(newName);
      expect(category.slug).toEqual(Slug.create('organic-fruits'));
      expect(category.updatedAt).toBe(newDate);

      expect(category.events).toHaveLength(3); // created + nameChanged + slugChanged
      const nameEvent = category.events[1];
      expect(nameEvent).toBeInstanceOf(CategoryNameChanged);
      expect(nameEvent.oldName).toBe(fixedName);
      expect(nameEvent.newName).toBe(newName);
      expect(nameEvent.timestamp).toBe(newDate);

      const slugEvent = category.events[2];
      expect(slugEvent).toBeInstanceOf(CategorySlugChanged);
      expect(slugEvent.oldSlug).toBe(oldSlug);
      expect(slugEvent.newSlug).toEqual(Slug.create('organic-fruits'));
      expect(slugEvent.timestamp).toBe(newDate);
    });

    it('should not change anything if name is same', () => {
      const eventsBefore = category.events.length;
      category.changeName(fixedName);
      expect(category.name).toBe(fixedName);
      expect(category.slug).toBe(fixedSlug);
      expect(category.events).toHaveLength(eventsBefore);
    });

    it('should emit only CategoryNameChanged if slug does not change', () => {
      // Tạo category với name và slug khác nhau
      const cat = Category.create({
        id: CategoryId.generate(),
        name: CategoryName.create('My Category'),
        slug: Slug.create('my-category'), // đã có slug
      });
      const eventsBefore = cat.events.length;
      const newName = CategoryName.create('My Category');
      cat.changeName(newName);
      expect(cat.events).toHaveLength(eventsBefore); // không có event mới
    });
  });

  describe('changeSlug()', () => {
    it('should change slug and emit event', () => {
      const newSlug = Slug.create('fresh-fruits');
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      category.changeSlug(newSlug, newDate);

      expect(category.slug).toBe(newSlug);
      expect(category.updatedAt).toBe(newDate);
      expect(category.events).toHaveLength(2);
      const event = category.events[1];
      expect(event).toBeInstanceOf(CategorySlugChanged);
      expect(event.oldSlug).toBe(fixedSlug);
      expect(event.newSlug).toBe(newSlug);
      expect(event.timestamp).toBe(newDate);
    });

    it('should not change anything if slug is same', () => {
      const eventsBefore = category.events.length;
      category.changeSlug(fixedSlug);
      expect(category.slug).toBe(fixedSlug);
      expect(category.events).toHaveLength(eventsBefore);
    });
  });

  describe('changeSortOrder()', () => {
    it('should change sort order and update updatedAt', () => {
      const newOrder = SortOrder.fromNumber(10);
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      category.changeSortOrder(newOrder, newDate);

      expect(category.sortOrder).toBe(newOrder);
      expect(category.updatedAt).toBe(newDate);
      expect(category.events).toHaveLength(1);
    });

    it('should not change anything if sort order is same', () => {
      category.changeSortOrder(fixedSortOrder);
      expect(category.sortOrder).toBe(fixedSortOrder);
      expect(category.updatedAt).toBe(fixedDate);
    });
  });

  describe('changeDescription()', () => {
    it('should change description and update updatedAt', () => {
      const newDesc = Description.create('New description');
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      category.changeDescription(newDesc, newDate);

      expect(category.description).toBe(newDesc);
      expect(category.updatedAt).toBe(newDate);
      expect(category.events).toHaveLength(1);
    });

    it('should not change anything if description is same', () => {
      category.changeDescription(fixedDescription);
      expect(category.description).toBe(fixedDescription);
      expect(category.updatedAt).toBe(fixedDate);
    });
  });

  describe('changeParent()', () => {
    it('should change parent and emit event', () => {
      const newParent = CategoryId.generate();
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      category.changeParent(newParent, newDate);

      expect(category.parentId).toBe(newParent);
      expect(category.updatedAt).toBe(newDate);
      expect(category.events).toHaveLength(2);
      const event = category.events[1];
      expect(event).toBeInstanceOf(CategoryParentChanged);
      expect(event.oldParentId).toBeNull();
      expect(event.newParentId).toBe(newParent);
      expect(event.timestamp).toBe(newDate);
    });

    it('should allow setting parent to null', () => {
      category.changeParent(null);
      expect(category.parentId).toBeNull();
    });

    it('should throw error if parentId equals self id', () => {
      expect(() => {
        category.changeParent(fixedId);
      }).toThrow('A category cannot be its own parent');
    });

    it('should not change anything if parent is same', () => {
      category.changeParent(null);
      expect(category.parentId).toBeNull();
      expect(category.updatedAt).toBe(fixedDate);
    });
  });

  describe('activate() and deactivate()', () => {
    it('should activate category and emit event', () => {
      category.deactivate();
      expect(category.isActive).toBe(false);
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      category.activate(newDate);

      expect(category.isActive).toBe(true);
      expect(category.updatedAt).toBe(newDate);
      expect(category.events).toHaveLength(3); // created + deactivated + activated
      const event = category.events[2];
      expect(event).toBeInstanceOf(CategoryActivated);
      expect(event.categoryId).toBe(fixedId);
      expect(event.timestamp).toBe(newDate);
    });

    it('should deactivate category and emit event', () => {
      const newDate = new Date('2025-02-01');
      jest.setSystemTime(newDate);

      category.deactivate(newDate);

      expect(category.isActive).toBe(false);
      expect(category.updatedAt).toBe(newDate);
      expect(category.events).toHaveLength(2);
      const event = category.events[1];
      expect(event).toBeInstanceOf(CategoryDeactivated);
      expect(event.categoryId).toBe(fixedId);
      expect(event.timestamp).toBe(newDate);
    });

    it('should do nothing if already active', () => {
      category.activate();
      expect(category.isActive).toBe(true);
      expect(category.events).toHaveLength(1);
    });

    it('should do nothing if already inactive', () => {
      category.deactivate();
      expect(category.isActive).toBe(false);
      category.deactivate();
      expect(category.events).toHaveLength(2); // only first deactivation emits event
    });
  });

  describe('isRoot()', () => {
    it('should return true if parentId is null', () => {
      expect(category.isRoot()).toBe(true);
    });

    it('should return false if parentId is set', () => {
      category.changeParent(CategoryId.generate());
      expect(category.isRoot()).toBe(false);
    });
  });

  describe('clearEvents()', () => {
    it('should clear all events', () => {
      expect(category.events).toHaveLength(1);
      category.clearEvents();
      expect(category.events).toHaveLength(0);
    });
  });

  describe('equals()', () => {
    it('should return true for same id', () => {
      const same = Category.reconstitute({
        id: fixedId,
        name: CategoryName.create('Different'),
        slug: Slug.create('different'),
        isActive: true,
        sortOrder: SortOrder.fromNumber(0),
        description: Description.create(),
        parentId: null,
        createdAt: fixedDate,
        updatedAt: fixedDate,
      });
      expect(category.equals(same)).toBe(true);
    });

    it('should return false for different id', () => {
      const different = Category.create({
        id: CategoryId.generate(),
        name: CategoryName.create('Other'),
      });
      expect(category.equals(different)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should allow changing parent to a different category', () => {
      const newParent = CategoryId.generate();
      category.changeParent(newParent);
      expect(category.parentId).toBe(newParent);
    });

    it('should handle name with special characters correctly', () => {
      const name = CategoryName.create('Fresh & Organic!');
      const cat = Category.create({
        id: CategoryId.generate(),
        name,
      });
      expect(cat.slug).toEqual(Slug.create('fresh-organic'));
    });

    it('should not allow empty name', () => {
      expect(() => CategoryName.create('')).toThrow(
        'Category name cannot be empty',
      );
    });

    it('should not allow invalid slug', () => {
      expect(() => Slug.create('Invalid Slug!')).toThrow(
        'Slug can only contain lowercase letters, numbers, and hyphens',
      );
      expect(() => Slug.create('--double-dash--')).toThrow(
        'Slug cannot contain consecutive hyphens',
      );
      expect(() => Slug.create('-start-dash')).toThrow(
        'Slug cannot start or end with a hyphen',
      );
    });

    it('should maintain updatedAt timestamp after each change', () => {
      const timestamps: Date[] = [];
      const initial = category.updatedAt;
      timestamps.push(initial);

      const newDate1 = new Date('2025-02-01');
      jest.setSystemTime(newDate1);
      category.changeName(CategoryName.create('New'), newDate1);
      timestamps.push(category.updatedAt);

      const newDate2 = new Date('2025-02-02');
      jest.setSystemTime(newDate2);
      category.changeSlug(Slug.create('new-slug'), newDate2);
      timestamps.push(category.updatedAt);

      const newDate3 = new Date('2025-02-03');
      jest.setSystemTime(newDate3);
      category.changeParent(CategoryId.generate(), newDate3);
      timestamps.push(category.updatedAt);

      // change sort order
      const newDate4 = new Date('2025-02-04');
      jest.setSystemTime(newDate4);
      category.changeSortOrder(SortOrder.fromNumber(99), newDate4);
      timestamps.push(category.updatedAt);

      expect(new Set(timestamps).size).toBe(timestamps.length);
      expect(timestamps).toEqual([
        fixedDate,
        newDate1,
        newDate2,
        newDate3,
        newDate4,
      ]);
    });
  });
});
