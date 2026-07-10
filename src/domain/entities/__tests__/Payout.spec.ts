import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { Payout } from '../payouts/Payout';
import { PayoutId } from '../../value-objects/PayoutId';
import { UserId } from '../../value-objects/UserId';
import { Money } from '../../value-objects/Money';
import { PayoutMethod } from '../../value-objects/PayoutMethod';
import { PayoutReference } from '../../value-objects/PayoutReference';
import { PayoutState } from '../../value-objects/PayoutState';
import { PayoutPaid } from '../../events/PayoutEvents';

describe('Payout Aggregate', () => {
  let payout: Payout;
  const fixedId = PayoutId.generate();
  const fixedUserId = UserId.generate();
  const fixedAmount = Money.fromDecimal(1_000_000);
  const fixedMethod = PayoutMethod.bankTransfer();
  const fixedDate = new Date('2025-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('017fe537-bb13-7c35-b52a-cb5490cce7be');

    payout = Payout.create({
      id: fixedId,
      userId: fixedUserId,
      amount: fixedAmount,
      method: fixedMethod,
      createdAt: fixedDate,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('create()', () => {
    it('should create payout with PENDING status', () => {
      expect(payout.id).toBe(fixedId);
      expect(payout.userId).toBe(fixedUserId);
      expect(payout.amount).toBe(fixedAmount);
      expect(payout.method).toBe(fixedMethod);
      expect(payout.status).toEqual(PayoutState.pending());
      expect(payout.reference).toBeNull();
      expect(payout.paidAt).toBeNull();
      expect(payout.createdAt).toBe(fixedDate);
    });

    it('should allow method to be null', () => {
      const p = Payout.create({
        id: PayoutId.generate(),
        userId: fixedUserId,
        amount: fixedAmount,
      });
      expect(p.method).toBeNull();
    });
  });

  describe('markPaid()', () => {
    it('should mark payout as paid and set reference', () => {
      const reference = PayoutReference.create('REF-123');
      const paidAt = new Date('2025-02-01');
      jest.setSystemTime(paidAt);

      payout.markPaid(reference, paidAt);

      expect(payout.status).toEqual(PayoutState.paid());
      expect(payout.reference).toBe(reference);
      expect(payout.paidAt).toBe(paidAt);
      expect(payout.events[1]).toBeInstanceOf(PayoutPaid);
    });

    it('should throw if already paid', () => {
      payout.markPaid(PayoutReference.create('REF-123'));
      expect(() => payout.markPaid(PayoutReference.create('REF-456'))).toThrow(
        'Payout is already paid',
      );
    });

    it('should throw if failed', () => {
      payout.markFailed();
      expect(() => payout.markPaid(PayoutReference.create('REF-123'))).toThrow(
        'Failed payout must be retried (mark as pending first)',
      );
    });
  });

  describe('markFailed()', () => {
    it('should mark payout as failed', () => {
      payout.markFailed();
      expect(payout.status).toEqual(PayoutState.failed());
    });

    it('should throw if already paid', () => {
      payout.markPaid(PayoutReference.create('REF-123'));
      expect(() => payout.markFailed()).toThrow(
        'Paid payout cannot be marked as failed',
      );
    });

    it('should allow retry from failed to pending (via reconstitute or application)', () => {
      payout.markFailed();
      // Trong application layer, có thể gọi setState để retry
      payout.setState(PayoutState.pending());
      expect(payout.status).toEqual(PayoutState.pending());
    });
  });

  describe('equals', () => {
    it('should return true for same id', () => {
      const same = Payout.reconstitute({
        id: fixedId,
        userId: fixedUserId,
        amount: fixedAmount,
        method: fixedMethod,
        reference: null,
        status: PayoutState.pending(),
        createdAt: fixedDate,
        paidAt: null,
      });
      expect(payout.equals(same)).toBe(true);
    });

    it('should return false for different id', () => {
      const other = Payout.create({
        id: PayoutId.generate(),
        userId: fixedUserId,
        amount: fixedAmount,
      });
      expect(payout.equals(other)).toBe(false);
    });
  });
});
