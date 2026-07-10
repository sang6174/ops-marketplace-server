import { ShopId } from '../value-objects/ShopId';
import { UserId } from '../value-objects/UserId';
import { ShopName } from '../value-objects/ShopName';
import { ShopDescription } from '../value-objects/ShopDescription';

export abstract class ShopEvent {
  constructor(
    public readonly shopId: ShopId,
    public readonly timestamp: Date,
  ) {}
}

export class ShopCreated extends ShopEvent {
  constructor(
    shopId: ShopId,
    public readonly ownerId: UserId,
    public readonly name: ShopName,
    public readonly description: ShopDescription,
    timestamp: Date,
  ) {
    super(shopId, timestamp);
  }
}

export class ShopUpdated extends ShopEvent {
  constructor(
    shopId: ShopId,
    public readonly oldName: ShopName,
    public readonly newName: ShopName,
    public readonly oldDescription: ShopDescription,
    public readonly newDescription: ShopDescription,
    timestamp: Date,
  ) {
    super(shopId, timestamp);
  }
}

export class ShopSoftDeleted extends ShopEvent {
  constructor(shopId: ShopId, timestamp: Date) {
    super(shopId, timestamp);
  }
}
