// src/domain/value-objects/money.spec.ts

import { describe, it, expect } from '@jest/globals';
import { Money } from './money';

describe('Money Value Object', () => {
  describe('constructor', () => {
    it('should create money with amount and default currency VND', () => {
      const money = new Money(1000);
      expect(money.amount).toBe(1000);
      expect(money.currency).toBe('VND');
    });

    it('should create money with custom currency', () => {
      const money = new Money(50, 'USD');
      expect(money.amount).toBe(50);
      expect(money.currency).toBe('USD');
    });

    it('should allow amount zero', () => {
      const money = new Money(0);
      expect(money.amount).toBe(0);
    });

    it('should allow negative amount', () => {
      const money = new Money(-100);
      expect(money.amount).toBe(-100);
    });
  });

  describe('add', () => {
    it('should add two money with same currency', () => {
      const money1 = new Money(1000, 'VND');
      const money2 = new Money(500, 'VND');
      const result = money1.add(money2);
      expect(result.amount).toBe(1500);
      expect(result.currency).toBe('VND');
      expect(result).toBeInstanceOf(Money);
    });

    it('should throw error when currencies mismatch', () => {
      const money1 = new Money(1000, 'VND');
      const money2 = new Money(50, 'USD');
      expect(() => money1.add(money2)).toThrow('Currency mismatch');
    });

    it('should handle negative addition', () => {
      const money1 = new Money(1000, 'VND');
      const money2 = new Money(-300, 'VND');
      const result = money1.add(money2);
      expect(result.amount).toBe(700);
    });
  });

  describe('subtract', () => {
    it('should subtract two money with same currency', () => {
      const money1 = new Money(1000, 'VND');
      const money2 = new Money(300, 'VND');
      const result = money1.subtract(money2);
      expect(result.amount).toBe(700);
      expect(result.currency).toBe('VND');
      expect(result).toBeInstanceOf(Money);
    });

    it('should throw error when currencies mismatch', () => {
      const money1 = new Money(1000, 'VND');
      const money2 = new Money(50, 'USD');
      expect(() => money1.subtract(money2)).toThrow('Currency mismatch');
    });

    it('should handle negative subtraction', () => {
      const money1 = new Money(1000, 'VND');
      const money2 = new Money(-200, 'VND');
      const result = money1.subtract(money2);
      expect(result.amount).toBe(1200);
    });

    it('should allow resulting negative amount', () => {
      const money1 = new Money(100, 'VND');
      const money2 = new Money(150, 'VND');
      const result = money1.subtract(money2);
      expect(result.amount).toBe(-50);
    });
  });

  describe('multiply', () => {
    it('should multiply money by positive factor', () => {
      const money = new Money(1000, 'VND');
      const result = money.multiply(2.5);
      expect(result.amount).toBe(2500);
      expect(result.currency).toBe('VND');
      expect(result).toBeInstanceOf(Money);
    });

    it('should multiply money by zero', () => {
      const money = new Money(1000, 'VND');
      const result = money.multiply(0);
      expect(result.amount).toBe(0);
    });

    it('should multiply money by negative factor', () => {
      const money = new Money(1000, 'VND');
      const result = money.multiply(-2);
      expect(result.amount).toBe(-2000);
    });

    it('should preserve currency after multiplication', () => {
      const money = new Money(50, 'USD');
      const result = money.multiply(3);
      expect(result.currency).toBe('USD');
    });
  });

  describe('equals', () => {
    it('should return true for same amount and currency', () => {
      const money1 = new Money(1000, 'VND');
      const money2 = new Money(1000, 'VND');
      expect(money1.equals(money2)).toBe(true);
    });

    it('should return false for different amount', () => {
      const money1 = new Money(1000, 'VND');
      const money2 = new Money(2000, 'VND');
      expect(money1.equals(money2)).toBe(false);
    });

    it('should return false for different currency', () => {
      const money1 = new Money(1000, 'VND');
      const money2 = new Money(1000, 'USD');
      expect(money1.equals(money2)).toBe(false);
    });

    it('should return false for non-Money object', () => {
      const money = new Money(1000, 'VND');
      expect(money.equals(null as any)).toBe(false);
      expect(money.equals({} as any)).toBe(false);
    });

    it('should return true for same amount and currency with zero', () => {
      const money1 = new Money(0, 'VND');
      const money2 = new Money(0, 'VND');
      expect(money1.equals(money2)).toBe(true);
    });

    it('should return false for zero vs non-zero', () => {
      const money1 = new Money(0, 'VND');
      const money2 = new Money(100, 'VND');
      expect(money1.equals(money2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should return new Money instance on add', () => {
      const money1 = new Money(1000, 'VND');
      const money2 = new Money(500, 'VND');
      const result = money1.add(money2);
      expect(result).not.toBe(money1);
      expect(result).not.toBe(money2);
      expect(money1.amount).toBe(1000); // unchanged
    });

    it('should return new Money instance on subtract', () => {
      const money1 = new Money(1000, 'VND');
      const money2 = new Money(300, 'VND');
      const result = money1.subtract(money2);
      expect(result).not.toBe(money1);
      expect(result).not.toBe(money2);
      expect(money1.amount).toBe(1000); // unchanged
    });

    it('should return new Money instance on multiply', () => {
      const money = new Money(1000, 'VND');
      const result = money.multiply(2);
      expect(result).not.toBe(money);
      expect(money.amount).toBe(1000); // unchanged
    });
  });

  describe('chaining operations', () => {
    it('should support chaining add and multiply', () => {
      const money = new Money(100, 'VND');
      const result = money
        .add(new Money(50, 'VND'))
        .multiply(2)
        .add(new Money(10, 'VND'));
      expect(result.amount).toBe(310);
      expect(result.currency).toBe('VND');
    });

    it('should support chaining add and subtract', () => {
      const money = new Money(100, 'VND');
      const result = money
        .add(new Money(50, 'VND'))
        .subtract(new Money(30, 'VND'));
      expect(result.amount).toBe(120);
    });

    it('should throw error when chaining with mismatched currency', () => {
      const money = new Money(100, 'VND');
      expect(() =>
        money.add(new Money(50, 'VND')).add(new Money(10, 'USD')),
      ).toThrow('Currency mismatch');
    });
  });
});
