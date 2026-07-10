import { CategoryId } from '../value-objects/CategoryId';
import { CategoryName } from '../value-objects/CategoryName';
import { Slug } from '../value-objects/Slug';

export abstract class CategoryEvent {
  constructor(
    public readonly categoryId: CategoryId,
    public readonly timestamp: Date,
  ) {}
}

export class CategoryCreated extends CategoryEvent {
  constructor(
    categoryId: CategoryId,
    public readonly name: CategoryName,
    public readonly slug: Slug,
    public readonly parentId: CategoryId | null,
    timestamp: Date,
  ) {
    super(categoryId, timestamp);
  }
}

export class CategoryNameChanged extends CategoryEvent {
  constructor(
    categoryId: CategoryId,
    public readonly oldName: CategoryName,
    public readonly newName: CategoryName,
    timestamp: Date,
  ) {
    super(categoryId, timestamp);
  }
}

export class CategorySlugChanged extends CategoryEvent {
  constructor(
    categoryId: CategoryId,
    public readonly oldSlug: Slug,
    public readonly newSlug: Slug,
    timestamp: Date,
  ) {
    super(categoryId, timestamp);
  }
}

export class CategoryActivated extends CategoryEvent {
  constructor(categoryId: CategoryId, timestamp: Date) {
    super(categoryId, timestamp);
  }
}

export class CategoryDeactivated extends CategoryEvent {
  constructor(categoryId: CategoryId, timestamp: Date) {
    super(categoryId, timestamp);
  }
}

export class CategoryParentChanged extends CategoryEvent {
  constructor(
    categoryId: CategoryId,
    public readonly oldParentId: CategoryId | null,
    public readonly newParentId: CategoryId | null,
    timestamp: Date,
  ) {
    super(categoryId, timestamp);
  }
}
