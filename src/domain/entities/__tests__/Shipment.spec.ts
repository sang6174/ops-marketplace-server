import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { Shipment } from '../../entities/orders/Shipment';
import { ShipperId } from '../../value-objects/ShipperId';
import { ShipmentId } from '../../value-objects/ShipmentId';
import { OrderId } from '../../value-objects/OrderId';
import { ShopId } from '../../value-objects/ShopId';
import { ShipmentStatus } from '../enums.enum';
import { Country } from '../../value-objects/Country';
import { Address } from '../../value-objects/Address';

import { AdministrativeDivision } from '../../value-objects/AdministrativeDivision';
import { TrackingNumber } from '../../value-objects/TrackingNumber';

function createMockAddress(street: string = '123 Main St'): Address {
  const country = new Country('VN', 'Vietnam');
  const province = new AdministrativeDivision(country, 2, 'VN-01', 'Hanoi');
  const district = new AdministrativeDivision(
    country,
    3,
    'VN-01-001',
    'Ba Dinh',
  );
  return Address.create({
    country,
    stateProvince: province,
    district,
    ward: null,
    street,
    postalCode: '100000',
  });
}

describe('Shipment Aggregate (with Value Objects)', () => {
  let shipment: Shipment;
  const fixedShipmentId = ShipmentId.generate();
  const fixedOrderId = OrderId.create('order-123');
  const fixedShopId = ShopId.create('shop-456');
  const fixedPickupAddress = createMockAddress('123 Pickup St');
  const fixedDeliveryAddress = createMockAddress('456 Delivery Ave');
  const fixedEstimatedDate = new Date('2025-02-01T00:00:00.000Z');
  const fixedDate = new Date('2025-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('017fe537-bb13-7c35-b52a-cb5490cce7be');

    shipment = Shipment.create({
      id: fixedShipmentId,
      orderId: fixedOrderId,
      shopId: fixedShopId,
      pickupAddress: fixedPickupAddress,
      deliveryAddress: fixedDeliveryAddress,
      estimatedDeliveryAt: fixedEstimatedDate,
      createdAt: fixedDate,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('create()', () => {
    it('should create shipment with PENDING status', () => {
      expect(shipment.id).toBe(fixedShipmentId);
      expect(shipment.orderId).toBe(fixedOrderId);
      expect(shipment.shopId).toBe(fixedShopId);
      expect(shipment.shipperId).toBeNull();
      expect(shipment.status).toBe(ShipmentStatus.PENDING);
      expect(shipment.trackingNumber).toBeNull();
      expect(shipment.pickupAddress).toBe(fixedPickupAddress);
      expect(shipment.deliveryAddress).toBe(fixedDeliveryAddress);
      expect(shipment.estimatedDeliveryAt).toBe(fixedEstimatedDate);
      expect(shipment.deliveredAt).toBeNull();
      expect(shipment.failedAt).toBeNull();
      expect(shipment.failureReason).toBeNull();
      expect(shipment.createdAt).toBe(fixedDate);
      expect(shipment.updatedAt).toBe(fixedDate);
    });

    it('should allow estimatedDeliveryAt to be null', () => {
      const s = Shipment.create({
        id: ShipmentId.generate(),
        orderId: fixedOrderId,
        shopId: fixedShopId,
        pickupAddress: fixedPickupAddress,
        deliveryAddress: fixedDeliveryAddress,
      });
      expect(s.estimatedDeliveryAt).toBeNull();
    });
  });

  describe('assignShipper()', () => {
    const shipperId = ShipperId.generate();

    it('should assign shipper and change status to ASSIGNED', () => {
      shipment.assignShipper(shipperId, TrackingNumber.create('NEW-TRH-456'));

      expect(shipment.shipperId).toBe(shipperId);
      expect(shipment.status).toBe(ShipmentStatus.ASSIGNED);
      expect(shipment.trackingNumber).toEqual({ _value: 'NEW-TRH-456' });
      expect(shipment.updatedAt).not.toBe(fixedDate);
    });

    it('should allow tracking number to be optional', () => {
      shipment.assignShipper(shipperId);
      expect(shipment.trackingNumber).toBeNull();
      expect(shipment.status).toBe(ShipmentStatus.ASSIGNED);
    });

    it('should throw if status is not PENDING', () => {
      shipment.assignShipper(shipperId);
      expect(() => shipment.assignShipper(ShipperId.generate())).toThrow(
        'Cannot assign shipper from state ASSIGNED',
      );
    });
  });

  describe('markAsPickedUp()', () => {
    it('should change status to PICKED_UP when ASSIGNED', () => {
      shipment.assignShipper(ShipperId.generate());
      shipment.markAsPickedUp();
      expect(shipment.status).toBe(ShipmentStatus.PICKED_UP);
    });

    it('should throw if not ASSIGNED', () => {
      expect(() => shipment.markAsPickedUp()).toThrow(
        'Cannot pick up from state PENDING',
      );
    });
  });

  describe('markAsInTransit()', () => {
    it('should change status to IN_TRANSIT when PICKED_UP', () => {
      shipment.assignShipper(ShipperId.generate());
      shipment.markAsPickedUp();
      shipment.markAsInTransit();
      expect(shipment.status).toBe(ShipmentStatus.IN_TRANSIT);
    });

    it('should throw if not PICKED_UP', () => {
      shipment.assignShipper(ShipperId.generate());
      expect(() => shipment.markAsInTransit()).toThrow(
        'Cannot mark in transit from state ASSIGNED',
      );
    });
  });

  describe('markAsDelivered()', () => {
    it('should change status to DELIVERED and set deliveredAt', () => {
      const deliveryTime = new Date('2025-01-03');
      jest.setSystemTime(deliveryTime);

      shipment.assignShipper(ShipperId.generate());
      shipment.markAsPickedUp();
      shipment.markAsInTransit();
      shipment.markAsDelivered();

      expect(shipment.status).toBe(ShipmentStatus.DELIVERED);
      expect(shipment.deliveredAt).toEqual(deliveryTime);
    });

    it('should throw if not IN_TRANSIT', () => {
      shipment.assignShipper(ShipperId.generate());
      shipment.markAsPickedUp();
      expect(() => shipment.markAsDelivered()).toThrow(
        'Cannot deliver from state PICKED_UP',
      );
    });
  });

  describe('markAsFailed()', () => {
    it('should change status to FAILED and set failure info', () => {
      shipment.assignShipper(ShipperId.generate());
      shipment.markAsPickedUp();
      shipment.markAsInTransit();
      shipment.markAsFailed('Lost in transit');

      expect(shipment.status).toBe(ShipmentStatus.FAILED);
      expect(shipment.failedAt).toBeDefined();
      expect(shipment.failureReason).toBe('Lost in transit');
    });

    it('should throw if reason is empty', () => {
      shipment.assignShipper(ShipperId.generate());
      expect(() => shipment.markAsFailed('')).toThrow(
        'Failure reason is required',
      );
    });
  });

  describe('markAsReturned()', () => {
    it('should change status to RETURNED when DELIVERED', () => {
      shipment.assignShipper(ShipperId.generate());
      shipment.markAsPickedUp();
      shipment.markAsInTransit();
      shipment.markAsDelivered();
      shipment.markAsReturned();
      expect(shipment.status).toBe(ShipmentStatus.RETURNED);
    });

    it('should throw if not DELIVERED', () => {
      expect(() => shipment.markAsReturned()).toThrow(
        'Cannot return from state PENDING',
      );
    });
  });

  describe('updateTrackingNumber()', () => {
    it('should update tracking number', () => {
      shipment.updateTrackingNumber(TrackingNumber.create('NEW-TRK-456'));
      expect(shipment.trackingNumber).toEqual({ _value: 'NEW-TRK-456' });
    });

    it('should throw if tracking number is empty', () => {
      expect(() =>
        shipment.updateTrackingNumber(TrackingNumber.create('NEW-TRK-456')),
      );
    });
  });

  describe('updateEstimatedDeliveryAt()', () => {
    it('should update estimated delivery date', () => {
      const newDate = new Date('2025-03-01');
      shipment.updateEstimatedDeliveryAt(newDate);
      expect(shipment.estimatedDeliveryAt).toBe(newDate);
    });

    it('should throw if already DELIVERED', () => {
      shipment.assignShipper(ShipperId.generate());
      shipment.markAsPickedUp();
      shipment.markAsInTransit();
      shipment.markAsDelivered();
      expect(() => shipment.updateEstimatedDeliveryAt(new Date())).toThrow(
        'Cannot update estimated delivery for terminal shipment',
      );
    });
  });

  describe('isTerminal()', () => {
    it('should return true for DELIVERED, FAILED, RETURNED', () => {
      expect(shipment.isTerminal()).toBe(false);

      shipment.assignShipper(ShipperId.generate());
      shipment.markAsPickedUp();
      shipment.markAsInTransit();
      shipment.markAsDelivered();
      expect(shipment.isTerminal()).toBe(true);

      const s2 = Shipment.create({
        id: ShipmentId.generate(),
        orderId: fixedOrderId,
        shopId: fixedShopId,
        pickupAddress: fixedPickupAddress,
        deliveryAddress: fixedDeliveryAddress,
      });
      s2.assignShipper(ShipperId.generate());
      s2.markAsFailed('Fail');
      expect(s2.isTerminal()).toBe(true);
    });
  });

  describe('canBeCancelled()', () => {
    it('should return true for PENDING and ASSIGNED', () => {
      expect(shipment.canBeCancelled()).toBe(true);
      shipment.assignShipper(ShipperId.generate());
      expect(shipment.canBeCancelled()).toBe(true);
    });

    it('should return false for other statuses', () => {
      shipment.assignShipper(ShipperId.generate());
      shipment.markAsPickedUp();
      expect(shipment.canBeCancelled()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('should return true for same id', () => {
      expect(shipment.equals(shipment)).toBe(true);
    });

    it('should return false for different shipment', () => {
      const other = Shipment.create({
        id: ShipmentId.generate(),
        orderId: fixedOrderId,
        shopId: fixedShopId,
        pickupAddress: fixedPickupAddress,
        deliveryAddress: fixedDeliveryAddress,
      });
      expect(shipment.equals(other)).toBe(false);
    });
  });
});
