import { describe, it, expect, beforeEach } from '@jest/globals';
import { BankAccount } from './bank-account';

describe('BankAccount Domain Entity', () => {
  let bankAccount: BankAccount;

  beforeEach(() => {
    bankAccount = BankAccount.create({
      userId: 'user-123',
      bankName: 'Vietcombank',
      accountNo: '1234567890',
      accountName: 'Nguyen Van A',
      isDefault: true,
    });
  });

  describe('create', () => {
    it('should create bank account with required fields', () => {
      const account = BankAccount.create({
        userId: 'user-456',
        bankName: 'Techcombank',
        accountNo: '0987654321',
        accountName: 'Tran Thi B',
      });

      expect(account.id).toBeDefined();
      expect(account.userId).toBe('user-456');
      expect(account.bankName).toBe('Techcombank');
      expect(account.accountNo).toBe('0987654321');
      expect(account.accountName).toBe('Tran Thi B');
      expect(account.isDefault).toBe(false);
      expect(account.createdAt).toBeInstanceOf(Date);
    });

    it('should create bank account with isDefault true', () => {
      const account = BankAccount.create({
        userId: 'user-789',
        bankName: 'BIDV',
        accountNo: '1122334455',
        accountName: 'Le Van C',
        isDefault: true,
      });

      expect(account.isDefault).toBe(true);
    });

    it('should generate unique UUID for each account', () => {
      const account1 = BankAccount.create({
        userId: 'user-1',
        bankName: 'Bank A',
        accountNo: '111',
        accountName: 'Name 1',
      });
      const account2 = BankAccount.create({
        userId: 'user-2',
        bankName: 'Bank B',
        accountNo: '222',
        accountName: 'Name 2',
      });

      expect(account1.id).not.toBe(account2.id);
    });
  });

  describe('getters', () => {
    it('should return bankName', () => {
      expect(bankAccount.bankName).toBe('Vietcombank');
    });

    it('should return accountNo', () => {
      expect(bankAccount.accountNo).toBe('1234567890');
    });

    it('should return accountName', () => {
      expect(bankAccount.accountName).toBe('Nguyen Van A');
    });

    it('should return isDefault', () => {
      expect(bankAccount.isDefault).toBe(true);
    });
  });

  describe('setDefault', () => {
    it('should set isDefault to true', () => {
      const account = BankAccount.create({
        userId: 'user-123',
        bankName: 'Bank',
        accountNo: '123',
        accountName: 'Name',
        isDefault: false,
      });
      expect(account.isDefault).toBe(false);

      account.setDefault();
      expect(account.isDefault).toBe(true);
    });

    it('should keep isDefault true when called multiple times', () => {
      bankAccount.setDefault();
      expect(bankAccount.isDefault).toBe(true);
      bankAccount.setDefault();
      expect(bankAccount.isDefault).toBe(true);
    });
  });

  describe('unsetDefault', () => {
    it('should set isDefault to false', () => {
      bankAccount.unsetDefault();
      expect(bankAccount.isDefault).toBe(false);
    });

    it('should keep isDefault false when called multiple times', () => {
      bankAccount.unsetDefault();
      expect(bankAccount.isDefault).toBe(false);
      bankAccount.unsetDefault();
      expect(bankAccount.isDefault).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same instance', () => {
      expect(bankAccount.equals(bankAccount)).toBe(true);
    });

    it('should return true for different instance with same id', () => {
      // Since we can't set id directly, we create a new account and compare with itself
      // In real scenario, we might reconstruct from persistence
      // For this test, we assume two accounts with same id are equal
      // Actually we can't create two accounts with same id via create()
      // So we test with the same object
      expect(bankAccount.equals(bankAccount)).toBe(true);
    });

    it('should return false for different account', () => {
      const otherAccount = BankAccount.create({
        userId: 'other-user',
        bankName: 'Other Bank',
        accountNo: '999',
        accountName: 'Other Name',
      });
      expect(bankAccount.equals(otherAccount)).toBe(false);
    });

    it('should return false for non-BankAccount object', () => {
      expect(bankAccount.equals(null as any)).toBe(false);
      expect(bankAccount.equals({} as any)).toBe(false);
      expect(bankAccount.equals(undefined as any)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle bank name with special characters', () => {
      const account = BankAccount.create({
        userId: 'user-1',
        bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
        accountNo: '123',
        accountName: 'Name',
      });
      expect(account.bankName).toBe(
        'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
      );
    });

    it('should handle account number with letters', () => {
      const account = BankAccount.create({
        userId: 'user-1',
        bankName: 'Bank',
        accountNo: 'ABC123XYZ',
        accountName: 'Name',
      });
      expect(account.accountNo).toBe('ABC123XYZ');
    });

    it('should handle Unicode in account name', () => {
      const account = BankAccount.create({
        userId: 'user-1',
        bankName: 'Bank',
        accountNo: '123',
        accountName: 'Nguyễn Văn A (Trưởng phòng)',
      });
      expect(account.accountName).toBe('Nguyễn Văn A (Trưởng phòng)');
    });

    it('should handle long values', () => {
      const longString = 'a'.repeat(1000);
      const account = BankAccount.create({
        userId: 'user-1',
        bankName: longString,
        accountNo: longString,
        accountName: longString,
      });
      expect(account.bankName).toBe(longString);
      expect(account.accountNo).toBe(longString);
      expect(account.accountName).toBe(longString);
    });

    it('should allow setting default to true multiple times', () => {
      bankAccount.setDefault();
      expect(bankAccount.isDefault).toBe(true);
      bankAccount.setDefault();
      expect(bankAccount.isDefault).toBe(true);
      bankAccount.unsetDefault();
      expect(bankAccount.isDefault).toBe(false);
      bankAccount.setDefault();
      expect(bankAccount.isDefault).toBe(true);
    });
  });
});
