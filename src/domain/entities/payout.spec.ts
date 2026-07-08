import { describe, it, expect, beforeEach } from '@jest/globals';
import { Payout } from './payout';
import { Money } from './value-objects/money';
import { PayoutStatus } from './enums.enum';

describe('Payout Domain Entity', () => {
  let payout: Payout;
  const testAmount = new Money(1000000, 'VND');

  beforeEach(() => {
    payout = Payout.create({
      userId: 'user-123',
      amount: testAmount,
      method: 'Bank Transfer',
    });
  });

  describe('create', () => {
    it('should create payout with required fields', () => {
      const newPayout = Payout.create({
        userId: 'user-456',
        amount: new Money(500000, 'VND'),
      });

      expect(newPayout.id).toBeDefined();
      expect(newPayout.userId).toBe('user-456');
      expect(newPayout.amount).toEqual(new Money(500000, 'VND'));
      expect(newPayout.status).toBe(PayoutStatus.PENDING);
      expect(newPayout.method).toBeNull();
      expect(newPayout.reference).toBeNull();
      expect(newPayout.paidAt).toBeNull();
      expect(newPayout.createdAt).toBeInstanceOf(Date);
    });

    it('should create payout with method when provided', () => {
      const newPayout = Payout.create({
        userId: 'user-789',
        amount: new Money(2000000, 'VND'),
        method: 'Bank Transfer',
      });

      expect(newPayout.method).toBe('Bank Transfer');
    });

    it('should generate unique UUID for each payout', () => {
      const payout1 = Payout.create({
        userId: 'user-1',
        amount: new Money(100, 'VND'),
      });
      const payout2 = Payout.create({
        userId: 'user-2',
        amount: new Money(200, 'VND'),
      });

      expect(payout1.id).not.toBe(payout2.id);
    });

    it('should handle Money with different currencies', () => {
      const newPayout = Payout.create({
        userId: 'user-1',
        amount: new Money(100, 'USD'),
      });
      expect(newPayout.amount.currency).toBe('USD');
      expect(newPayout.amount.amount).toBe(100);
    });
  });

  describe('getters', () => {
    it('should return amount', () => {
      expect(payout.amount).toEqual(testAmount);
    });

    it('should return status', () => {
      expect(payout.status).toBe(PayoutStatus.PENDING);
    });

    it('should return method', () => {
      expect(payout.method).toBe('Bank Transfer');
    });

    it('should return reference as null initially', () => {
      expect(payout.reference).toBeNull();
    });

    it('should return paidAt as null initially', () => {
      expect(payout.paidAt).toBeNull();
    });
  });

  describe('markPaid', () => {
    it('should mark payout as paid with reference and timestamp', () => {
      const reference = 'TXN-123456';
      expect(payout.status).toBe(PayoutStatus.PENDING);
      expect(payout.reference).toBeNull();
      expect(payout.paidAt).toBeNull();

      payout.markPaid(reference);

      expect(payout.status).toBe(PayoutStatus.PAID);
      expect(payout.reference).toBe(reference);
      expect(payout.paidAt).toBeInstanceOf(Date);
    });

    it('should throw error when marking non-pending payout as paid', () => {
      payout.markPaid('TXN-001');
      expect(payout.status).toBe(PayoutStatus.PAID);

      expect(() => payout.markPaid('TXN-002')).toThrow('Payout is not pending');
    });

    it('should throw error when marking failed payout as paid', () => {
      payout.markFailed();
      expect(payout.status).toBe(PayoutStatus.FAILED);

      expect(() => payout.markPaid('TXN-003')).toThrow('Payout is not pending');
    });

    it('should set reference correctly with special characters', () => {
      const reference = 'TXN-ABC_123!@#';
      payout.markPaid(reference);
      expect(payout.reference).toBe(reference);
    });

    it('should set paidAt timestamp when marking as paid', () => {
      const before = new Date();
      payout.markPaid('TXN-001');
      const after = new Date();
      expect(payout.paidAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(payout.paidAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('markFailed', () => {
    it('should mark pending payout as failed', () => {
      expect(payout.status).toBe(PayoutStatus.PENDING);

      payout.markFailed();

      expect(payout.status).toBe(PayoutStatus.FAILED);
      expect(payout.reference).toBeNull();
      expect(payout.paidAt).toBeNull();
    });

    it('should throw error when marking non-pending payout as failed', () => {
      payout.markPaid('TXN-001');
      expect(payout.status).toBe(PayoutStatus.PAID);

      expect(() => payout.markFailed()).toThrow('Payout is not pending');
    });

    it('should throw error when marking already failed payout as failed', () => {
      payout.markFailed();
      expect(payout.status).toBe(PayoutStatus.FAILED);

      expect(() => payout.markFailed()).toThrow('Payout is not pending');
    });

    it('should not change reference or paidAt when marking as failed', () => {
      // Create a payout, mark it paid, then try to mark failed (should throw)
      // So we test failed on a fresh payout that hasn't been paid
      const freshPayout = Payout.create({
        userId: 'user-1',
        amount: new Money(100, 'VND'),
      });
      freshPayout.markFailed();
      expect(freshPayout.reference).toBeNull();
      expect(freshPayout.paidAt).toBeNull();
    });
  });

  describe('equals', () => {
    it('should return true for same instance', () => {
      expect(payout.equals(payout)).toBe(true);
    });

    it('should return false for different payout', () => {
      const otherPayout = Payout.create({
        userId: 'other-user',
        amount: new Money(500000, 'VND'),
        method: 'Credit Card',
      });
      expect(payout.equals(otherPayout)).toBe(false);
    });

    it('should return false for non-Payout object', () => {
      expect(payout.equals(null as any)).toBe(false);
      expect(payout.equals({} as any)).toBe(false);
      expect(payout.equals(undefined as any)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle zero amount', () => {
      const zeroPayout = Payout.create({
        userId: 'user-1',
        amount: new Money(0, 'VND'),
      });
      expect(zeroPayout.amount.amount).toBe(0);
      expect(zeroPayout.amount.currency).toBe('VND');
    });

    it('should handle negative amount (if allowed)', () => {
      // Depending on business rules, negative amount might be allowed or not
      // The entity itself doesn't validate, so we test the behavior
      const negativePayout = Payout.create({
        userId: 'user-1',
        amount: new Money(-100000, 'VND'),
      });
      expect(negativePayout.amount.amount).toBe(-100000);
    });

    it('should handle very large amount', () => {
      const largeAmount = new Money(9999999999999, 'VND');
      const largePayout = Payout.create({
        userId: 'user-1',
        amount: largeAmount,
      });
      expect(largePayout.amount.amount).toBe(9999999999999);
    });

    it('should handle method with empty string', () => {
      const payoutWithEmptyMethod = Payout.create({
        userId: 'user-1',
        amount: new Money(100, 'VND'),
        method: '',
      });
      expect(payoutWithEmptyMethod.method).toBe('');
    });

    it('should handle different Money currencies', () => {
      const usdPayout = Payout.create({
        userId: 'user-1',
        amount: new Money(100, 'USD'),
      });
      expect(usdPayout.amount.currency).toBe('USD');
      expect(usdPayout.amount.amount).toBe(100);

      const vndPayout = Payout.create({
        userId: 'user-2',
        amount: new Money(1000000, 'VND'),
      });
      expect(vndPayout.amount.currency).toBe('VND');
    });

    it('should allow setting reference with Unicode characters', () => {
      const reference = 'TXN-đơn-hàng-123';
      payout.markPaid(reference);
      expect(payout.reference).toBe(reference);
    });

    it('should update status correctly from PENDING to PAID to PAID (no change)', () => {
      payout.markPaid('TXN-001');
      expect(payout.status).toBe(PayoutStatus.PAID);
      // Cannot mark PAID again, would throw
      expect(() => payout.markPaid('TXN-002')).toThrow('Payout is not pending');
    });

    it('should update status correctly from PENDING to FAILED to FAILED (no change)', () => {
      const freshPayout = Payout.create({
        userId: 'user-1',
        amount: new Money(100, 'VND'),
      });
      freshPayout.markFailed();
      expect(freshPayout.status).toBe(PayoutStatus.FAILED);
      // Cannot mark FAILED again
      expect(() => freshPayout.markFailed()).toThrow('Payout is not pending');
    });
  });
});
