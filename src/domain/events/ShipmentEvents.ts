import { ShipmentId } from '../value-objects/ShipmentId';
import { OrderId } from '../value-objects/OrderId';
import { ShopId } from '../value-objects/ShopId';
import { ShipperId } from '../value-objects/ShipperId';

export abstract class ShipmentEvent {
  constructor(
    public readonly shipmentId: ShipmentId,
    public readonly orderId: OrderId,
    public readonly timestamp: Date,
  ) {}
}

export class ShipmentCreated extends ShipmentEvent {
  constructor(
    shipmentId: ShipmentId,
    orderId: OrderId,
    public readonly shopId: ShopId,
    timestamp: Date,
  ) {
    super(shipmentId, orderId, timestamp);
  }
}

export class ShipperAssigned extends ShipmentEvent {
  constructor(
    shipmentId: ShipmentId,
    orderId: OrderId,
    timestamp: Date,
    public readonly shipperId: ShipperId,
    public readonly trackingNumber?: string,
  ) {
    super(shipmentId, orderId, timestamp);
  }
}

export class ShipmentPickedUp extends ShipmentEvent {
  constructor(shipmentId: ShipmentId, orderId: OrderId, timestamp: Date) {
    super(shipmentId, orderId, timestamp);
  }
}

export class ShipmentInTransit extends ShipmentEvent {
  constructor(shipmentId: ShipmentId, orderId: OrderId, timestamp: Date) {
    super(shipmentId, orderId, timestamp);
  }
}

export class ShipmentDelivered extends ShipmentEvent {
  constructor(
    shipmentId: ShipmentId,
    orderId: OrderId,
    public readonly deliveredAt: Date,
    timestamp: Date,
  ) {
    super(shipmentId, orderId, timestamp);
  }
}

export class ShipmentFailed extends ShipmentEvent {
  constructor(
    shipmentId: ShipmentId,
    orderId: OrderId,
    public readonly reason: string,
    timestamp: Date,
  ) {
    super(shipmentId, orderId, timestamp);
  }
}

export class ShipmentReturned extends ShipmentEvent {
  constructor(shipmentId: ShipmentId, orderId: OrderId, timestamp: Date) {
    super(shipmentId, orderId, timestamp);
  }
}
