import { ShipmentId } from '../../value-objects/ShipmentId';
import { OrderId } from '../../value-objects/OrderId';
import { ShopId } from '../../value-objects/ShopId';
import { ShipperId } from '../../value-objects/ShipperId';
import { TrackingNumber } from '../../value-objects/TrackingNumber';
import { Address } from '../../value-objects/Address';
import { ShipmentState } from '../../state/ShipmentState';
import { ShipmentStatus } from '../enums.enum';
import {
  ShipmentCreated,
  ShipperAssigned,
  ShipmentPickedUp,
  ShipmentInTransit,
  ShipmentDelivered,
  ShipmentFailed,
  ShipmentReturned,
} from '../../events/ShipmentEvents';

export class Shipment {
  private _events: any[] = [];

  private constructor(
    public readonly id: ShipmentId,
    public readonly orderId: OrderId,
    public readonly shopId: ShopId,
    private _shipperId: ShipperId | null,
    private _state: ShipmentState,
    private _trackingNumber: TrackingNumber | null,
    private _pickupAddress: Address,
    private _deliveryAddress: Address,
    private _estimatedDeliveryAt: Date | null,
    private _deliveredAt: Date | null,
    private _failedAt: Date | null,
    private _failureReason: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    initialState?: ShipmentState,
  ) {
    this._state = initialState || ShipmentState.pending();
  }

  static create(props: {
    id: ShipmentId;
    orderId: OrderId;
    shopId: ShopId;
    pickupAddress: Address;
    deliveryAddress: Address;
    estimatedDeliveryAt?: Date;
    createdAt?: Date;
  }): Shipment {
    if (!props.pickupAddress) throw new Error('Pickup address is required');
    if (!props.deliveryAddress) throw new Error('Delivery address is required');
    const now = props.createdAt || new Date();
    const shipment = new Shipment(
      props.id,
      props.orderId,
      props.shopId,
      null,
      ShipmentState.pending(),
      null,
      props.pickupAddress,
      props.deliveryAddress,
      props.estimatedDeliveryAt ?? null,
      null,
      null,
      null,
      now,
      now,
    );
    shipment.addEvent(
      new ShipmentCreated(props.id, props.orderId, props.shopId, now),
    );
    return shipment;
  }

  static reconstitute(props: {
    id: ShipmentId;
    orderId: OrderId;
    shopId: ShopId;
    shipperId: ShipperId | null;
    status: ShipmentStatus;
    trackingNumber: TrackingNumber | null;
    pickupAddress: Address;
    deliveryAddress: Address;
    estimatedDeliveryAt: Date | null;
    deliveredAt: Date | null;
    failedAt: Date | null;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Shipment {
    const state = Shipment.createStateFromStatus(props.status);
    return new Shipment(
      props.id,
      props.orderId,
      props.shopId,
      props.shipperId,
      state,
      props.trackingNumber,
      props.pickupAddress,
      props.deliveryAddress,
      props.estimatedDeliveryAt,
      props.deliveredAt,
      props.failedAt,
      props.failureReason,
      props.createdAt,
      props.updatedAt,
      state,
    );
  }

  private static createStateFromStatus(status: ShipmentStatus): ShipmentState {
    switch (status) {
      case ShipmentStatus.PENDING:
        return ShipmentState.pending();
      case ShipmentStatus.ASSIGNED:
        return ShipmentState.assigned();
      case ShipmentStatus.PICKED_UP:
        return ShipmentState.pickedUp();
      case ShipmentStatus.IN_TRANSIT:
        return ShipmentState.inTransit();
      case ShipmentStatus.DELIVERED:
        return ShipmentState.delivered();
      case ShipmentStatus.FAILED:
        return ShipmentState.failed();
      case ShipmentStatus.RETURNED:
        return ShipmentState.returned();
      default:
        throw new Error(`Unknown shipment status: ${status}`);
    }
  }

  // ===== Getters =====
  get shipperId(): ShipperId | null {
    return this._shipperId;
  }
  get state(): ShipmentState {
    return this._state;
  }
  get status(): ShipmentStatus {
    return this._state.value;
  }
  get trackingNumber(): TrackingNumber | null {
    return this._trackingNumber;
  }
  get pickupAddress(): Address {
    return this._pickupAddress;
  }
  get deliveryAddress(): Address {
    return this._deliveryAddress;
  }
  get estimatedDeliveryAt(): Date | null {
    return this._estimatedDeliveryAt;
  }
  get deliveredAt(): Date | null {
    return this._deliveredAt;
  }
  get failedAt(): Date | null {
    return this._failedAt;
  }
  get failureReason(): string | null {
    return this._failureReason;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get events(): any[] {
    return [...this._events];
  }

  assignShipper(
    shipperId: ShipperId,
    trackingNumber?: TrackingNumber,
    timestamp: Date = new Date(),
  ): void {
    const newState = ShipmentState.assigned();
    if (!this._state.canTransitionTo(newState)) {
      throw new Error(`Cannot assign shipper from state ${this._state.value}`);
    }
    this._shipperId = shipperId;
    this._trackingNumber = trackingNumber ?? null;
    this._state = newState;
    this._touch(timestamp);
    this.addEvent(
      new ShipperAssigned(
        this.id,
        this.orderId,
        timestamp,
        shipperId,
        trackingNumber?.value,
      ),
    );
  }

  markAsPickedUp(timestamp: Date = new Date()): void {
    const newState = ShipmentState.pickedUp();
    if (!this._state.canTransitionTo(newState)) {
      throw new Error(`Cannot pick up from state ${this._state.value}`);
    }
    this._state = newState;
    this._touch(timestamp);
    this.addEvent(new ShipmentPickedUp(this.id, this.orderId, timestamp));
  }

  markAsInTransit(timestamp: Date = new Date()): void {
    const newState = ShipmentState.inTransit();
    if (!this._state.canTransitionTo(newState)) {
      throw new Error(`Cannot mark in transit from state ${this._state.value}`);
    }
    this._state = newState;
    this._touch(timestamp);
    this.addEvent(new ShipmentInTransit(this.id, this.orderId, timestamp));
  }

  markAsDelivered(timestamp: Date = new Date()): void {
    const newState = ShipmentState.delivered();
    if (!this._state.canTransitionTo(newState)) {
      throw new Error(`Cannot deliver from state ${this._state.value}`);
    }
    this._state = newState;
    this._deliveredAt = timestamp;
    this._touch(timestamp);
    this.addEvent(
      new ShipmentDelivered(
        this.id,
        this.orderId,
        this._deliveredAt,
        timestamp,
      ),
    );
  }

  markAsFailed(reason: string, timestamp: Date = new Date()): void {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Failure reason is required');
    }
    const newState = ShipmentState.failed();
    if (!this._state.canTransitionTo(newState)) {
      throw new Error(`Cannot fail shipment from state ${this._state.value}`);
    }
    this._state = newState;
    this._failedAt = timestamp;
    this._failureReason = reason.trim();
    this._touch(timestamp);
    this.addEvent(new ShipmentFailed(this.id, this.orderId, reason, timestamp));
  }

  markAsReturned(timestamp: Date = new Date()): void {
    const newState = ShipmentState.returned();
    if (!this._state.canTransitionTo(newState)) {
      throw new Error(`Cannot return from state ${this._state.value}`);
    }
    this._state = newState;
    this._touch(timestamp);
    this.addEvent(new ShipmentReturned(this.id, this.orderId, timestamp));
  }

  updateTrackingNumber(
    trackingNumber: TrackingNumber,
    timestamp: Date = new Date(),
  ): void {
    if (this._state.isTerminal()) {
      throw new Error('Cannot update tracking number for terminal shipment');
    }
    this._trackingNumber = trackingNumber;
    this._touch(timestamp);
  }

  updateEstimatedDeliveryAt(date: Date, timestamp: Date = new Date()): void {
    if (this._state.isTerminal()) {
      throw new Error('Cannot update estimated delivery for terminal shipment');
    }
    this._estimatedDeliveryAt = date;
    this._touch(timestamp);
  }

  isTerminal(): boolean {
    return this._state.isTerminal();
  }

  canBeCancelled(): boolean {
    return this._state.canBeCancelled();
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

  equals(other: Shipment): boolean {
    return other instanceof Shipment && this.id.equals(other.id);
  }
}
