// domain/entities/shipment.spec.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { Shipment } from './shipment';
import { ShipmentStatus } from './enums.enum';

describe('Shipment Domain Entity', () => {
  let shipment: Shipment;

  beforeEach(() => {
    shipment = Shipment.create({
      orderId: 'order-123',
      shopId: 'shop-456',
      pickupAddress: '123 Seller St, HCM',
      deliveryAddress: '456 Buyer Ave, HN',
      estimatedDeliveryAt: new Date('2025-01-20'),
    });
  });

  describe('create', () => {
    it('should create shipment with required fields and default status PENDING', () => {
      expect(shipment.id).toBeDefined();
      expect(shipment.orderId).toBe('order-123');
      expect(shipment.shopId).toBe('shop-456');
      expect(shipment.pickupAddress).toBe('123 Seller St, HCM');
      expect(shipment.deliveryAddress).toBe('456 Buyer Ave, HN');
      expect(shipment.status).toBe(ShipmentStatus.PENDING);
      expect(shipment.shipperId).toBeNull();
      expect(shipment.trackingNumber).toBeNull();
      expect(shipment.estimatedDeliveryAt).toEqual(new Date('2025-01-20'));
      expect(shipment.deliveredAt).toBeNull();
      expect(shipment.failedAt).toBeNull();
      expect(shipment.failureReason).toBeNull();
      expect(shipment.createdAt).toBeInstanceOf(Date);
      expect(shipment.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error if pickup address is empty', () => {
      expect(() =>
        Shipment.create({
          orderId: 'o1',
          shopId: 's1',
          pickupAddress: '',
          deliveryAddress: 'addr',
        }),
      ).toThrow('Pickup address is required');
    });

    it('should throw error if delivery address is empty', () => {
      expect(() =>
        Shipment.create({
          orderId: 'o1',
          shopId: 's1',
          pickupAddress: 'addr',
          deliveryAddress: '',
        }),
      ).toThrow('Delivery address is required');
    });
  });

  describe('assignShipper', () => {
    it('should assign shipper and change status to ASSIGNED', () => {
      expect(shipment.status).toBe(ShipmentStatus.PENDING);
      shipment.assignShipper('shipper-1', 'TRK123');
      expect(shipment.shipperId).toBe('shipper-1');
      expect(shipment.trackingNumber).toBe('TRK123');
      expect(shipment.status).toBe(ShipmentStatus.ASSIGNED);
    });

    it('should allow assignment without tracking number', () => {
      shipment.assignShipper('shipper-1');
      expect(shipment.shipperId).toBe('shipper-1');
      expect(shipment.trackingNumber).toBeNull();
    });

    it('should throw error if status is not PENDING', () => {
      shipment.assignShipper('s1');
      expect(() => shipment.assignShipper('s2')).toThrow(
        'Cannot assign shipper to a shipment that is not pending',
      );
    });

    it('should throw error if shipperId is empty', () => {
      expect(() => shipment.assignShipper('')).toThrow(
        'Shipper ID is required',
      );
    });
  });

  describe('status transitions', () => {
    it('should follow correct lifecycle: PENDING → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED', () => {
      shipment.assignShipper('s1');
      expect(shipment.status).toBe(ShipmentStatus.ASSIGNED);
      shipment.markAsPickedUp();
      expect(shipment.status).toBe(ShipmentStatus.PICKED_UP);
      shipment.markAsInTransit();
      expect(shipment.status).toBe(ShipmentStatus.IN_TRANSIT);
      shipment.markAsDelivered();
      expect(shipment.status).toBe(ShipmentStatus.DELIVERED);
      expect(shipment.deliveredAt).toBeInstanceOf(Date);
    });

    it('should allow failure from ASSIGNED, PICKED_UP, or IN_TRANSIT', () => {
      shipment.assignShipper('s1');
      shipment.markAsPickedUp();
      shipment.markAsFailed('Lost in transit');
      expect(shipment.status).toBe(ShipmentStatus.FAILED);
      expect(shipment.failedAt).toBeInstanceOf(Date);
      expect(shipment.failureReason).toBe('Lost in transit');
    });

    it('should throw error on invalid transition', () => {
      // Cannot pick up before assigned
      expect(() => shipment.markAsPickedUp()).toThrow(
        'Shipment must be assigned before pick up',
      );

      // Cannot mark as delivered without being in transit
      shipment.assignShipper('s1');
      expect(() => shipment.markAsDelivered()).toThrow(
        'Shipment must be in transit before delivery',
      );
    });

    it('should allow return only from DELIVERED', () => {
      shipment.assignShipper('s1');
      shipment.markAsPickedUp();
      shipment.markAsInTransit();
      shipment.markAsDelivered();
      shipment.markAsReturned();
      expect(shipment.status).toBe(ShipmentStatus.RETURNED);
    });

    it('should throw error when returning non-delivered shipment', () => {
      expect(() => shipment.markAsReturned()).toThrow(
        'Only delivered shipments can be returned',
      );
    });
  });

  describe('updateTrackingNumber', () => {
    it('should update tracking number', () => {
      shipment.assignShipper('s1');
      shipment.updateTrackingNumber('NEW123');
      expect(shipment.trackingNumber).toBe('NEW123');
    });

    it('should throw error if tracking number is empty', () => {
      expect(() => shipment.updateTrackingNumber('')).toThrow(
        'Tracking number cannot be empty',
      );
    });
  });

  describe('updateEstimatedDeliveryAt', () => {
    it('should update estimated delivery date', () => {
      const newDate = new Date('2025-02-01');
      shipment.updateEstimatedDeliveryAt(newDate);
      expect(shipment.estimatedDeliveryAt).toEqual(newDate);
    });

    it('should throw error if already delivered', () => {
      shipment.assignShipper('s1');
      shipment.markAsPickedUp();
      shipment.markAsInTransit();
      shipment.markAsDelivered();
      expect(() => shipment.updateEstimatedDeliveryAt(new Date())).toThrow(
        'Cannot update estimated delivery for delivered/returned shipment',
      );
    });
  });

  describe('isTerminal', () => {
    it('should return false for non-terminal states', () => {
      expect(shipment.isTerminal()).toBe(false);
      shipment.assignShipper('s1');
      expect(shipment.isTerminal()).toBe(false);
    });

    it('should return true for DELIVERED, FAILED, RETURNED', () => {
      shipment.assignShipper('s1');
      shipment.markAsPickedUp();
      shipment.markAsInTransit();
      shipment.markAsDelivered();
      expect(shipment.isTerminal()).toBe(true);

      const failedShipment = Shipment.create({
        orderId: 'o2',
        shopId: 's2',
        pickupAddress: 'a1',
        deliveryAddress: 'a2',
      });
      failedShipment.assignShipper('s1');
      failedShipment.markAsPickedUp();
      failedShipment.markAsFailed('Failed');
      expect(failedShipment.isTerminal()).toBe(true);
    });
  });

  describe('canBeCancelled', () => {
    it('should return true for PENDING or ASSIGNED', () => {
      expect(shipment.canBeCancelled()).toBe(true);
      shipment.assignShipper('s1');
      expect(shipment.canBeCancelled()).toBe(true);
      shipment.markAsPickedUp();
      expect(shipment.canBeCancelled()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same instance', () => {
      expect(shipment.equals(shipment)).toBe(true);
    });

    it('should return false for different shipment', () => {
      const other = Shipment.create({
        orderId: 'o2',
        shopId: 's2',
        pickupAddress: 'a1',
        deliveryAddress: 'a2',
      });
      expect(shipment.equals(other)).toBe(false);
    });

    it('should return false for non-Shipment object', () => {
      expect(shipment.equals(null as any)).toBe(false);
      expect(shipment.equals({} as any)).toBe(false);
    });
  });
});
