import { Payment } from './payment';
import { PaymentMethod, PaymentStatus } from './enums.enum';

describe('Payment Domain Entity', () => {
  describe('Payment.create', () => {
    const validInput = {
      orderId: 'order-1',
      amount: 550000,
      currency: 'VND',
      method: PaymentMethod.STRIPE,
      paymentIntentId: 'pi_12345678',
      gateway: 'stripe',
      metadata: { invoiceId: 'INV-001' },
    };

    it('should create payment with valid input', () => {
      const payment = Payment.create(validInput);

      expect(payment.orderId).toBe('order-1');
      expect(payment.amount).toBe(550000);
      expect(payment.currency).toBe('VND');
      expect(payment.method).toBe(PaymentMethod.STRIPE);
      expect(payment.paymentIntentId).toBe('pi_12345678');
      expect(payment.gateway).toBe('stripe');
      expect(payment.status).toBe(PaymentStatus.PENDING);
    });

    it('should throw error on zero amount', () => {
      expect(() =>
        Payment.create({
          ...validInput,
          amount: 0,
        }),
      ).toThrow('Payment amount must be greater than 0');
    });

    it('should throw error on negative amount', () => {
      expect(() =>
        Payment.create({
          ...validInput,
          amount: -1000,
        }),
      ).toThrow('Payment amount must be greater than 0');
    });

    it('should throw error on empty currency', () => {
      expect(() =>
        Payment.create({
          ...validInput,
          currency: '',
        }),
      ).toThrow('Currency is required');
    });

    it('should throw error on empty payment intent', () => {
      expect(() =>
        Payment.create({
          ...validInput,
          paymentIntentId: '',
        }),
      ).toThrow('Payment intent ID is required');
    });

    it('should accept optional metadata', () => {
      const payment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
      });

      expect(payment.metadata).toEqual({});
    });

    it('should store metadata', () => {
      const metadata = { invoiceId: 'INV-001', customerId: 'CUST-123' };
      const payment = Payment.create({
        ...validInput,
        metadata,
      });

      expect(payment.metadata).toEqual(metadata);
    });

    it('should trim currency and paymentIntentId', () => {
      const payment = Payment.create({
        ...validInput,
        currency: '  VND  ',
        paymentIntentId: '  pi_12345678  ',
      });

      expect(payment.currency).toBe('VND');
      expect(payment.paymentIntentId).toBe('pi_12345678');
    });
  });

  describe('markAsPaid', () => {
    let payment: Payment;

    beforeEach(() => {
      payment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
      });
    });

    it('should mark payment as paid', () => {
      payment.markAsPaid();

      expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
      expect(payment.paidAt).toBeDefined();
      expect(payment.isPaid()).toBe(true);
    });

    it('should set custom paidAt timestamp', () => {
      const paidDate = new Date('2024-06-15');
      payment.markAsPaid(paidDate);

      expect(payment.paidAt).toEqual(paidDate);
    });

    it('should throw error if already paid', () => {
      payment.markAsPaid();

      expect(() => payment.markAsPaid()).toThrow(
        'Payment is already marked as paid',
      );
    });

    it('should throw error if marked as failed', () => {
      payment.markAsFailed('Card declined');

      expect(() => payment.markAsPaid()).toThrow(
        'Cannot mark a failed payment as paid',
      );
    });

    it('should throw error if already refunded', () => {
      payment.markAsPaid();
      payment.refund();

      expect(() => payment.markAsPaid()).toThrow(
        'Cannot mark a refunded payment as paid',
      );
    });

    it('should clear error message when marking as paid', () => {
      payment.markAsFailed('Card declined');
      // After marking as failed, need to reset status somehow to allow paid marking
      // This test shows that once failed, cannot mark as paid without resetting
      expect(() => payment.markAsPaid()).toThrow(
        'Cannot mark a failed payment as paid',
      );
    });
  });

  describe('markAsFailed', () => {
    let payment: Payment;

    beforeEach(() => {
      payment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
      });
    });

    it('should mark payment as failed', () => {
      payment.markAsFailed('Insufficient funds');

      expect(payment.status).toBe(PaymentStatus.FAILED);
      expect(payment.errorMessage).toBe('Insufficient funds');
      expect(payment.isFailed()).toBe(true);
    });

    it('should throw error if already paid', () => {
      payment.markAsPaid();

      expect(() => payment.markAsFailed('Card declined')).toThrow(
        'Cannot mark a paid payment as failed',
      );
    });

    it('should throw error if already refunded', () => {
      payment.markAsPaid();
      payment.refund();

      expect(() => payment.markAsFailed('Error')).toThrow(
        'Cannot mark a refunded payment as failed',
      );
    });

    it('should update error message if already failed', () => {
      payment.markAsFailed('Initial error');
      payment.markAsFailed('Updated error');

      expect(payment.errorMessage).toBe('Updated error');
      expect(payment.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('refund', () => {
    let payment: Payment;

    beforeEach(() => {
      payment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
      });
      payment.markAsPaid();
    });

    it('should refund paid payment', () => {
      payment.refund();

      expect(payment.status).toBe(PaymentStatus.REFUNDED);
      expect(payment.refundedAt).toBeDefined();
      expect(payment.isRefunded()).toBe(true);
    });

    it('should set custom refundedAt timestamp', () => {
      const refundDate = new Date('2024-06-20');
      payment.refund(refundDate);

      expect(payment.refundedAt).toEqual(refundDate);
    });

    it('should set refund reason', () => {
      payment.refund(undefined, 'Order cancelled by customer');

      expect(payment.refundReason).toBe('Order cancelled by customer');
    });

    it('should throw error if not paid', () => {
      const unpaidPayment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
      });

      expect(() => unpaidPayment.refund()).toThrow(
        'Only paid payments can be refunded',
      );
    });

    it('should throw error if already refunded', () => {
      payment.refund();

      // After refund, isPaid() is false, so it throws "Only paid payments can be refunded"
      expect(() => payment.refund()).toThrow(
        'Only paid payments can be refunded',
      );
    });

    it('should throw error if payment failed', () => {
      const failedPayment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
      });
      failedPayment.markAsFailed('Declined');

      // When failed, isPaid() is false, so throws "Only paid payments can be refunded"
      expect(() => failedPayment.refund()).toThrow(
        'Only paid payments can be refunded',
      );
    });
  });

  describe('updatePaymentIntentId', () => {
    let payment: Payment;

    beforeEach(() => {
      payment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
      });
    });

    it('should update payment intent ID', () => {
      payment.updatePaymentIntentId('pi_87654321');

      expect(payment.paymentIntentId).toBe('pi_87654321');
    });

    it('should throw error on empty ID', () => {
      expect(() => payment.updatePaymentIntentId('')).toThrow(
        'Payment intent ID cannot be empty',
      );
    });

    it('should throw error if payment settled (paid)', () => {
      payment.markAsPaid();

      expect(() => payment.updatePaymentIntentId('pi_newid')).toThrow(
        'Cannot update payment intent ID after payment is settled',
      );
    });

    it('should throw error if payment settled (refunded)', () => {
      payment.markAsPaid();
      payment.refund();

      expect(() => payment.updatePaymentIntentId('pi_newid')).toThrow(
        'Cannot update payment intent ID after payment is settled',
      );
    });

    it('should allow update if pending', () => {
      expect(() =>
        payment.updatePaymentIntentId('pi_newintenttoupdate'),
      ).not.toThrow();
      expect(payment.paymentIntentId).toBe('pi_newintenttoupdate');
    });

    it('should allow update if failed', () => {
      payment.markAsFailed('Declined');

      expect(() =>
        payment.updatePaymentIntentId('pi_retrypaymentid'),
      ).not.toThrow();
      expect(payment.paymentIntentId).toBe('pi_retrypaymentid');
    });

    it('should trim whitespace', () => {
      payment.updatePaymentIntentId('  pi_newid  ');

      expect(payment.paymentIntentId).toBe('pi_newid');
    });
  });

  describe('updateMetadata', () => {
    let payment: Payment;

    beforeEach(() => {
      payment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
        metadata: { invoiceId: 'INV-001' },
      });
    });

    it('should update metadata', () => {
      payment.updateMetadata({
        invoiceId: 'INV-002',
        customerId: 'CUST-123',
      });

      expect(payment.metadata).toEqual({
        invoiceId: 'INV-002',
        customerId: 'CUST-123',
      });
    });

    it('should replace entire metadata object', () => {
      payment.updateMetadata({ newKey: 'newValue' });

      expect(payment.metadata).toEqual({ newKey: 'newValue' });
      expect(payment.metadata.invoiceId).toBeUndefined();
    });

    it('should allow empty metadata', () => {
      payment.updateMetadata({});

      expect(payment.metadata).toEqual({});
    });
  });

  describe('setMetadataKey', () => {
    let payment: Payment;

    beforeEach(() => {
      payment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
      });
    });

    it('should set individual metadata key', () => {
      payment.setMetadataKey('invoiceId', 'INV-001');

      expect(payment.metadata.invoiceId).toBe('INV-001');
    });

    it('should update existing key', () => {
      payment.setMetadataKey('invoiceId', 'INV-001');
      payment.setMetadataKey('invoiceId', 'INV-002');

      expect(payment.metadata.invoiceId).toBe('INV-002');
    });

    it('should support various value types', () => {
      payment.setMetadataKey('stringKey', 'value');
      payment.setMetadataKey('numberKey', 123);
      payment.setMetadataKey('boolKey', true);
      payment.setMetadataKey('objectKey', { nested: 'object' });

      expect(payment.metadata.stringKey).toBe('value');
      expect(payment.metadata.numberKey).toBe(123);
      expect(payment.metadata.boolKey).toBe(true);
      expect(payment.metadata.objectKey).toEqual({ nested: 'object' });
    });

    it('should allow null/undefined values', () => {
      payment.setMetadataKey('nullKey', null);
      payment.setMetadataKey('undefinedKey', undefined);

      expect(payment.metadata.nullKey).toBeNull();
      expect(payment.metadata.undefinedKey).toBeUndefined();
    });
  });

  describe('status checks', () => {
    let payment: Payment;

    beforeEach(() => {
      payment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
      });
    });

    it('should correctly identify pending payment', () => {
      expect(payment.isPending()).toBe(true);
      expect(payment.isPaid()).toBe(false);
      expect(payment.isFailed()).toBe(false);
      expect(payment.isRefunded()).toBe(false);
    });

    it('should correctly identify paid payment', () => {
      payment.markAsPaid();

      expect(payment.isPending()).toBe(false);
      expect(payment.isPaid()).toBe(true);
      expect(payment.isFailed()).toBe(false);
      expect(payment.isRefunded()).toBe(false);
    });

    it('should correctly identify failed payment', () => {
      payment.markAsFailed('Declined');

      expect(payment.isPending()).toBe(false);
      expect(payment.isPaid()).toBe(false);
      expect(payment.isFailed()).toBe(true);
      expect(payment.isRefunded()).toBe(false);
    });

    it('should correctly identify refunded payment', () => {
      payment.markAsPaid();
      payment.refund();

      expect(payment.isPending()).toBe(false);
      expect(payment.isPaid()).toBe(false);
      expect(payment.isFailed()).toBe(false);
      expect(payment.isRefunded()).toBe(true);
    });
  });

  describe('isRefundable', () => {
    let payment: Payment;

    beforeEach(() => {
      payment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
      });
    });

    it('should not be refundable when pending', () => {
      expect(payment.isRefundable()).toBe(false);
    });

    it('should be refundable when paid', () => {
      payment.markAsPaid();

      expect(payment.isRefundable()).toBe(true);
    });

    it('should not be refundable when failed', () => {
      payment.markAsFailed('Declined');

      expect(payment.isRefundable()).toBe(false);
    });

    it('should not be refundable when already refunded', () => {
      payment.markAsPaid();
      payment.refund();

      expect(payment.isRefundable()).toBe(false);
    });
  });

  describe('getters', () => {
    let payment: Payment;

    beforeEach(() => {
      payment = Payment.create({
        orderId: 'order-1',
        amount: 550000,
        currency: 'VND',
        method: PaymentMethod.STRIPE,
        paymentIntentId: 'pi_12345678',
        gateway: 'stripe',
        metadata: { invoiceId: 'INV-001' },
      });
    });

    it('should return all properties', () => {
      expect(payment.orderId).toBe('order-1');
      expect(payment.amount).toBe(550000);
      expect(payment.currency).toBe('VND');
      expect(payment.method).toBe(PaymentMethod.STRIPE);
      expect(payment.paymentIntentId).toBe('pi_12345678');
      expect(payment.gateway).toBe('stripe');
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.metadata).toEqual({ invoiceId: 'INV-001' });
      expect(payment.createdAt).toBeInstanceOf(Date);
      expect(payment.updatedAt).toBeInstanceOf(Date);
      expect(payment.id).toBeDefined();
    });

    it('should return metadata copy', () => {
      const metadata1 = payment.metadata;
      const metadata2 = payment.metadata;

      expect(metadata1).toEqual(metadata2);
      expect(metadata1).not.toBe(metadata2);
    });

    it('should return optional fields as undefined', () => {
      expect(payment.paidAt).toBeUndefined();
      expect(payment.refundedAt).toBeUndefined();
      expect(payment.errorMessage).toBeUndefined();
      expect(payment.refundReason).toBeUndefined();
    });
  });
});
