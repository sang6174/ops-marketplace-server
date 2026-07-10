import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Payment } from '../../entities/orders/Payment';
import { PaymentId } from '../../value-objects/PaymentId';
import { OrderId } from '../../value-objects/OrderId';
import { Money } from '../../value-objects/Money';
import { Currency } from '../../value-objects/Currency';
import { PaymentIntentId } from '../../value-objects/PaymentIntentId';
import { Gateway } from '../../value-objects/Gateway';
import { Metadata } from '../../value-objects/Metadata';
import { PaymentMethod, PaymentStatus } from '../enums.enum';
import {
  PaymentCreated,
  PaymentSucceeded,
  PaymentFailed,
  PaymentRefunded,
} from '../../events/PaymentEvents';

describe('Payment Aggregate (with Value Objects)', () => {
  let payment: Payment;
  const fixedId = PaymentId.generate();
  const fixedOrderId = OrderId.create('order-123');

  const fixedAmount = Money.fromDecimal(150_000, Currency.VND);
  const fixedMethod = PaymentMethod.CREDIT_CARD;
  const fixedIntentId = PaymentIntentId.create('pi_123456');
  const fixedGateway = Gateway.create('stripe');
  const fixedMetadata = Metadata.create({ customer: 'John Doe' });
  const fixedDate = new Date('2025-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('123e4567-e89b-12d3-a456-426614174000');

    payment = Payment.create({
      id: fixedId,
      orderId: fixedOrderId,
      amount: fixedAmount,
      method: fixedMethod,
      paymentIntentId: fixedIntentId,
      gateway: fixedGateway,
      metadata: fixedMetadata,
      createdAt: fixedDate,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('create()', () => {
    it('should create payment with all given values', () => {
      expect(payment.id).toBe(fixedId);
      expect(payment.orderId).toBe(fixedOrderId);
      expect(payment.amount).toBe(fixedAmount);
      expect(payment.method).toBe(fixedMethod);
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.paymentIntentId).toBe(fixedIntentId);
      expect(payment.gateway).toBe(fixedGateway);
      expect(payment.metadata).toEqual(fixedMetadata);
      expect(payment.createdAt).toBe(fixedDate);
      expect(payment.updatedAt).toBe(fixedDate);
      expect(payment.events[0]).toBeInstanceOf(PaymentCreated);
    });

    it('should default metadata to empty if not provided', () => {
      const p = Payment.create({
        id: PaymentId.generate(),
        orderId: fixedOrderId,
        amount: fixedAmount,
        method: PaymentMethod.BANK_TRANSFER,
        paymentIntentId: PaymentIntentId.create('pi_cash'),
        gateway: Gateway.create('bank_transfer'),
      });
      expect(p.metadata).toEqual(Metadata.create());
    });
  });

  describe('reconstitute()', () => {
    it('should recreate payment from persistence', () => {
      const reconstituted = Payment.reconstitute({
        id: fixedId,
        orderId: fixedOrderId,
        amount: fixedAmount,
        method: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.SUCCEEDED,
        paymentIntentId: fixedIntentId,
        gateway: Gateway.create('bank_transfer'),
        metadata: Metadata.create({ key: 'value' }),
        createdAt: fixedDate,
        updatedAt: new Date('2025-02-01'),
        paidAt: new Date('2025-01-02'),
        refundedAt: undefined,
        errorMessage: undefined,
        refundReason: undefined,
      });
      expect(reconstituted.status).toBe(PaymentStatus.SUCCEEDED);
      expect(reconstituted.paidAt).toEqual(new Date('2025-01-02'));
    });
  });

  describe('status checks', () => {
    it('should return correct status flags', () => {
      expect(payment.isPending()).toBe(true);
      expect(payment.isPaid()).toBe(false);
      expect(payment.isFailed()).toBe(false);
      expect(payment.isRefunded()).toBe(false);
      expect(payment.isRefundable()).toBe(false);

      payment.markAsPaid();
      expect(payment.isPaid()).toBe(true);
      expect(payment.isRefundable()).toBe(true);

      payment.refund();
      expect(payment.isRefunded()).toBe(true);
      expect(payment.isRefundable()).toBe(false);
    });
  });

  describe('markAsPaid()', () => {
    it('should mark as paid and emit event', () => {
      const paidAt = new Date('2025-02-01T00:00:00.000Z');

      jest.setSystemTime(paidAt);
      payment.markAsPaid(paidAt);
      expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
      expect(payment.paidAt).toEqual(paidAt);
      expect(payment.updatedAt).toEqual(paidAt);
      expect(payment.events[1]).toBeInstanceOf(PaymentSucceeded);
    });

    it('should throw if already paid', () => {
      payment.markAsPaid();
      expect(() => payment.markAsPaid()).toThrow(
        'Payment is already marked as paid',
      );
    });

    it('should throw if failed', () => {
      payment.markAsFailed('Error');
      expect(() => payment.markAsPaid()).toThrow(
        'Cannot mark a failed payment as paid',
      );
    });
  });

  describe('markAsFailed()', () => {
    it('should mark as failed and emit event', () => {
      const msg = 'Network error';
      payment.markAsFailed(msg);
      expect(payment.status).toBe(PaymentStatus.FAILED);
      expect(payment.errorMessage).toBe(msg);
      expect(payment.events[1]).toBeInstanceOf(PaymentFailed);
    });

    it('should update error message if already failed', () => {
      payment.markAsFailed('Error1');
      payment.markAsFailed('Error2');
      expect(payment.errorMessage).toBe('Error2');
      expect(payment.status).toBe(PaymentStatus.FAILED);
      expect(payment.events).toHaveLength(2);
    });

    it('should throw if paid', () => {
      payment.markAsPaid();
      expect(() => payment.markAsFailed('Error')).toThrow(
        'Cannot mark a paid payment as failed',
      );
    });
  });

  describe('refund()', () => {
    beforeEach(() => payment.markAsPaid());

    it('should refund and emit event', () => {
      const reason = 'Customer request';
      payment.refund(undefined, reason);
      expect(payment.status).toBe(PaymentStatus.REFUNDED);
      expect(payment.refundReason).toBe(reason);
      expect(payment.events[2]).toBeInstanceOf(PaymentRefunded);
    });

    it('should throw if not paid', () => {
      const p = Payment.create({
        id: PaymentId.generate(),
        orderId: OrderId.create('order-456'),
        amount: fixedAmount,
        method: PaymentMethod.CREDIT_CARD,
        paymentIntentId: PaymentIntentId.create('pi_456'),
        gateway: Gateway.create('stripe'),
      });
      expect(() => p.refund()).toThrow('Only paid payments can be refunded');
    });

    it('should throw if already refunded', () => {
      payment.refund();
      expect(() => payment.refund()).toThrow(
        'Only paid payments can be refunded',
      );
    });
  });

  describe('updatePaymentIntentId()', () => {
    it('should update intent id', () => {
      const newId = PaymentIntentId.create('pi_new');
      payment.updatePaymentIntentId(newId);
      expect(payment.paymentIntentId).toBe(newId);
    });

    it('should throw if already paid', () => {
      payment.markAsPaid();
      expect(() =>
        payment.updatePaymentIntentId(PaymentIntentId.create('pi_new')),
      ).toThrow('Cannot update payment intent ID after payment is settled');
    });
  });

  describe('metadata methods', () => {
    it('should replace metadata', () => {
      const newMeta = Metadata.create({ new: true });
      payment.updateMetadata(newMeta);
      expect(payment.metadata).toEqual(newMeta);
    });

    it('should set a single key', () => {
      payment.setMetadataKey('key', 'value');
      expect(payment.metadata.value.key).toBe('value');
    });

    it('should not change if same metadata', () => {
      const oldUpdated = payment.updatedAt;
      payment.updateMetadata(fixedMetadata);
      expect(payment.updatedAt).toBe(oldUpdated);
    });
  });

  describe('edge cases', () => {
    it('should handle metadata immutability', () => {
      const original = payment.metadata;
      const newMeta = original.value;
      newMeta.customer = 'Jane';
      expect(payment.metadata).toEqual(fixedMetadata);
    });

    it('should not allow negative amount via Money', () => {
      expect(() => Money.fromDecimal(-100, Currency.VND)).toThrow();
    });
  });
});
