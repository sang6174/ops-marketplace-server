// domain/entities/Category.ts
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

export class Category {
  private _events: any[] = [];

  private constructor(
    public readonly id: CategoryId,
    private _name: CategoryName,
    private _slug: Slug,
    private _isActive: boolean,
    private _sortOrder: SortOrder,
    private _description: Description,
    private _parentId: CategoryId | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: {
    id: CategoryId;
    name: CategoryName;
    slug?: Slug;
    parentId?: CategoryId | null;
    sortOrder?: SortOrder;
    description?: Description;
    isActive?: boolean;
    createdAt?: Date;
  }): Category {
    const now = props.createdAt || new Date();
    const slug = props.slug ?? Slug.generateFromName(props.name);
    const sortOrder = props.sortOrder ?? SortOrder.fromNumber(0);
    const description = props.description ?? Description.create();
    const isActive = props.isActive ?? true;
    const parentId = props.parentId ?? null;

    if (props.parentId && props.parentId.equals(props.id)) {
      throw new Error('A category cannot be its own parent');
    }

    const category = new Category(
      props.id,
      props.name,
      slug,
      isActive,
      sortOrder,
      description,
      parentId,
      now,
      now,
    );

    category.addEvent(
      new CategoryCreated(props.id, props.name, slug, parentId, now),
    );
    return category;
  }

  static reconstitute(props: {
    id: CategoryId;
    name: CategoryName;
    slug: Slug;
    isActive: boolean;
    sortOrder: SortOrder;
    description: Description;
    parentId: CategoryId | null;
    createdAt: Date;
    updatedAt: Date;
  }): Category {
    return new Category(
      props.id,
      props.name,
      props.slug,
      props.isActive,
      props.sortOrder,
      props.description,
      props.parentId,
      props.createdAt,
      props.updatedAt,
    );
  }

  get name(): CategoryName {
    return this._name;
  }
  get slug(): Slug {
    return this._slug;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get sortOrder(): SortOrder {
    return this._sortOrder;
  }
  get description(): Description {
    return this._description;
  }
  get parentId(): CategoryId | null {
    return this._parentId;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get events(): any[] {
    return [...this._events];
  }

  changeName(newName: CategoryName, timestamp: Date = new Date()): void {
    if (this._name.equals(newName)) return;
    const oldName = this._name;
    const oldSlug = this._slug;
    this._name = newName;
    this._slug = Slug.generateFromName(newName);
    this._touch(timestamp);
    this.addEvent(
      new CategoryNameChanged(this.id, oldName, newName, timestamp),
    );
    if (!oldSlug.equals(this._slug)) {
      this.addEvent(
        new CategorySlugChanged(this.id, oldSlug, this._slug, timestamp),
      );
    }
  }

  changeSlug(newSlug: Slug, timestamp: Date = new Date()): void {
    if (this._slug.equals(newSlug)) return;
    const oldSlug = this._slug;
    this._slug = newSlug;
    this._touch(timestamp);
    this.addEvent(
      new CategorySlugChanged(this.id, oldSlug, newSlug, timestamp),
    );
  }

  changeSortOrder(newOrder: SortOrder, timestamp: Date = new Date()): void {
    if (this._sortOrder.equals(newOrder)) return;
    this._sortOrder = newOrder;
    this._touch(timestamp);
  }

  changeDescription(
    newDescription: Description,
    timestamp: Date = new Date(),
  ): void {
    if (this._description.equals(newDescription)) return;
    this._description = newDescription;
    this._touch(timestamp);
  }

  changeParent(
    newParentId: CategoryId | null,
    timestamp: Date = new Date(),
  ): void {
    if (newParentId && newParentId.equals(this.id)) {
      throw new Error('A category cannot be its own parent');
    }
    if (this._parentId === newParentId) return;
    const oldParentId = this._parentId;
    this._parentId = newParentId;
    this._touch(timestamp);
    this.addEvent(
      new CategoryParentChanged(this.id, oldParentId, newParentId, timestamp),
    );
  }

  activate(timestamp: Date = new Date()): void {
    if (this._isActive) return;
    this._isActive = true;
    this._touch(timestamp);
    this.addEvent(new CategoryActivated(this.id, timestamp));
  }

  deactivate(timestamp: Date = new Date()): void {
    if (!this._isActive) return;
    this._isActive = false;
    this._touch(timestamp);
    this.addEvent(new CategoryDeactivated(this.id, timestamp));
  }

  isRoot(): boolean {
    return this._parentId === null;
  }

  private _touch(timestamp: Date): void {
    this._updatedAt = timestamp;
  }

  private addEvent(event: any): void {
    this._events.push(event);
  }

  clearEvents(): void {
    this._events = [];
  }

  equals(other: Category): boolean {
    return other instanceof Category && this.id.equals(other.id);
  }
}
