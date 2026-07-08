import { ShipmentStatus } from './enums.enum';

export class Shipment {
  private constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly shopId: string,
    private _shipperId: string | null,
    private _status: ShipmentStatus,
    private _trackingNumber: string | null,
    private _pickupAddress: string,
    private _deliveryAddress: string,
    private _estimatedDeliveryAt: Date | null,
    private _deliveredAt: Date | null,
    private _failedAt: Date | null,
    private _failureReason: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: {
    orderId: string;
    shopId: string;
    pickupAddress: string;
    deliveryAddress: string;
    estimatedDeliveryAt?: Date;
  }): Shipment {
    if (!props.pickupAddress || props.pickupAddress.trim().length === 0) {
      throw new Error('Pickup address is required');
    }
    if (!props.deliveryAddress || props.deliveryAddress.trim().length === 0) {
      throw new Error('Delivery address is required');
    }
    const now = new Date();
    return new Shipment(
      crypto.randomUUID(),
      props.orderId,
      props.shopId,
      null,
      ShipmentStatus.PENDING,
      null,
      props.pickupAddress.trim(),
      props.deliveryAddress.trim(),
      props.estimatedDeliveryAt ?? null,
      null,
      null,
      null,
      now,
      now,
    );
  }

  get shipperId(): string | null {
    return this._shipperId;
  }
  get status(): ShipmentStatus {
    return this._status;
  }
  get trackingNumber(): string | null {
    return this._trackingNumber;
  }
  get pickupAddress(): string {
    return this._pickupAddress;
  }
  get deliveryAddress(): string {
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

  // ===== Behaviors =====

  assignShipper(shipperId: string, trackingNumber?: string): void {
    if (this._status !== ShipmentStatus.PENDING) {
      throw new Error(
        'Cannot assign shipper to a shipment that is not pending',
      );
    }
    if (!shipperId || shipperId.trim().length === 0) {
      throw new Error('Shipper ID is required');
    }
    this._shipperId = shipperId.trim();
    this._status = ShipmentStatus.ASSIGNED;
    if (trackingNumber) {
      this._trackingNumber = trackingNumber.trim();
    }
    this._touch();
  }

  markAsPickedUp(): void {
    if (this._status !== ShipmentStatus.ASSIGNED) {
      throw new Error('Shipment must be assigned before pick up');
    }
    this._status = ShipmentStatus.PICKED_UP;
    this._touch();
  }

  markAsInTransit(): void {
    if (this._status !== ShipmentStatus.PICKED_UP) {
      throw new Error('Shipment must be picked up before being in transit');
    }
    this._status = ShipmentStatus.IN_TRANSIT;
    this._touch();
  }

  markAsDelivered(): void {
    if (this._status !== ShipmentStatus.IN_TRANSIT) {
      throw new Error('Shipment must be in transit before delivery');
    }
    this._status = ShipmentStatus.DELIVERED;
    this._deliveredAt = new Date();
    this._touch();
  }

  markAsFailed(reason: string): void {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Failure reason is required');
    }
    if (
      this._status !== ShipmentStatus.ASSIGNED &&
      this._status !== ShipmentStatus.PICKED_UP &&
      this._status !== ShipmentStatus.IN_TRANSIT
    ) {
      throw new Error('Cannot fail shipment in current status');
    }
    this._status = ShipmentStatus.FAILED;
    this._failedAt = new Date();
    this._failureReason = reason.trim();
    this._touch();
  }

  markAsReturned(): void {
    if (this._status !== ShipmentStatus.DELIVERED) {
      throw new Error('Only delivered shipments can be returned');
    }
    this._status = ShipmentStatus.RETURNED;
    this._touch();
  }

  updateTrackingNumber(trackingNumber: string): void {
    if (!trackingNumber || trackingNumber.trim().length === 0) {
      throw new Error('Tracking number cannot be empty');
    }
    this._trackingNumber = trackingNumber.trim();
    this._touch();
  }

  updateEstimatedDeliveryAt(date: Date): void {
    if (
      this._status === ShipmentStatus.DELIVERED ||
      this._status === ShipmentStatus.RETURNED
    ) {
      throw new Error(
        'Cannot update estimated delivery for delivered/returned shipment',
      );
    }
    this._estimatedDeliveryAt = date;
    this._touch();
  }

  isTerminal(): boolean {
    return (
      this._status === ShipmentStatus.DELIVERED ||
      this._status === ShipmentStatus.FAILED ||
      this._status === ShipmentStatus.RETURNED
    );
  }

  canBeCancelled(): boolean {
    return (
      this._status === ShipmentStatus.PENDING ||
      this._status === ShipmentStatus.ASSIGNED
    );
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }

  equals(other: Shipment): boolean {
    if (!(other instanceof Shipment)) return false;
    return this.id === other.id;
  }
}
