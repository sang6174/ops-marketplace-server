import { ShopId } from '../../value-objects/ShopId';
import { UserId } from '../../value-objects/UserId';
import { ShopName } from '../../value-objects/ShopName';
import { ShopDescription } from '../../value-objects/ShopDescription';
import {
  ShopCreated,
  ShopUpdated,
  ShopSoftDeleted,
} from '../../events/ShopEvents';

export class Shop {
  private _events: any[] = [];

  private constructor(
    public readonly id: ShopId,
    public readonly ownerId: UserId,
    private _name: ShopName,
    private _description: ShopDescription,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    private _deletedAt: Date | null,
  ) {}

  static create(props: {
    id: ShopId;
    ownerId: UserId;
    name: ShopName;
    description?: ShopDescription;
    createdAt?: Date;
  }): Shop {
    const now = props.createdAt || new Date();
    const description = props.description ?? ShopDescription.create();
    const shop = new Shop(
      props.id,
      props.ownerId,
      props.name,
      description,
      now,
      now,
      null,
    );
    shop.addEvent(
      new ShopCreated(props.id, props.ownerId, props.name, description, now),
    );
    return shop;
  }

  static reconstitute(props: {
    id: ShopId;
    ownerId: UserId;
    name: ShopName;
    description: ShopDescription;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): Shop {
    return new Shop(
      props.id,
      props.ownerId,
      props.name,
      props.description,
      props.createdAt,
      props.updatedAt,
      props.deletedAt,
    );
  }

  get name(): ShopName {
    return this._name;
  }
  get description(): ShopDescription {
    return this._description;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get deletedAt(): Date | null {
    return this._deletedAt;
  }
  get events(): any[] {
    return [...this._events];
  }

  updateInfo(
    name: ShopName,
    description?: ShopDescription,
    timestamp: Date = new Date(),
  ): void {
    const oldName = this._name;
    const oldDescription = this._description;
    const newDescription = description ?? this._description;

    if (this._deletedAt !== null) {
      throw new Error('Cannot update a deleted shop');
    }

    this._name = name;
    this._description = newDescription;
    this._touch(timestamp);

    if (!oldName.equals(name) || !oldDescription.equals(newDescription)) {
      this.addEvent(
        new ShopUpdated(
          this.id,
          oldName,
          name,
          oldDescription,
          newDescription,
          timestamp,
        ),
      );
    }
  }

  softDelete(timestamp: Date = new Date()): void {
    if (this._deletedAt !== null) return;
    this._deletedAt = timestamp;
    this._touch(timestamp);
    this.addEvent(new ShopSoftDeleted(this.id, timestamp));
  }

  isDeleted(): boolean {
    return this._deletedAt !== null;
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

  equals(other: Shop): boolean {
    return other instanceof Shop && this.id.equals(other.id);
  }
}
