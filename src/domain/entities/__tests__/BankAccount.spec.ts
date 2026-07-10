import { describe, it, expect, beforeEach } from '@jest/globals';
import { BankAccount } from '../financial/BankAccount';
import { BankName } from '../../value-objects/BankName';
import { BankAccountNumber } from '../../value-objects/BankAccountNumber';
import { AccountHolderName } from '../../value-objects/BankAccountHolderName';

function createValidBankAccountProps(
  overrides?: Partial<{
    id: string;
    userId: string;
    bankName: BankName;
    accountNo: BankAccountNumber;
    accountName: AccountHolderName;
    isDefault: boolean;
    createdAt: Date;
  }>,
) {
  const defaultProps = {
    id: 'test-id-1',
    userId: 'user-123',
    bankName: BankName.create('Vietcombank'),
    accountNo: BankAccountNumber.create('1234567890'),
    accountName: AccountHolderName.create('Nguyen Van A'),
    isDefault: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  };
  return { ...defaultProps, ...overrides };
}

describe('BankAccount Domain Entity (new version)', () => {
  let bankAccount: BankAccount;
  let fixedDate: Date;
  let fixedId: string;

  beforeEach(() => {
    fixedDate = new Date('2025-01-01T00:00:00.000Z');
    fixedId = 'fixed-id-123';
    bankAccount = BankAccount.create({
      id: fixedId,
      userId: 'user-123',
      bankName: BankName.create('Vietcombank'),
      accountNo: BankAccountNumber.create('1234567890'),
      accountName: AccountHolderName.create('Nguyen Van A'),
      isDefault: true,
      createdAt: fixedDate,
    });
  });

  describe('create()', () => {
    it('should create a BankAccount with all provided fields', () => {
      const id = 'custom-id';
      const userId = 'user-456';
      const bankName = BankName.create('Techcombank');
      const accountNo = BankAccountNumber.create('0987654321');
      const accountName = AccountHolderName.create('Tran Thi B');
      const isDefault = false;
      const createdAt = new Date('2025-02-01T00:00:00.000Z');

      const account = BankAccount.create({
        id,
        userId,
        bankName,
        accountNo,
        accountName,
        isDefault,
        createdAt,
      });

      expect(account.id).toBe(id);
      expect(account.userId).toBe(userId);
      expect(account.bankName).toBe(bankName);
      expect(account.accountNo).toBe(accountNo);
      expect(account.accountName).toBe(accountName);
      expect(account.isDefault).toBe(isDefault);
      expect(account.createdAt).toBe(createdAt);
    });

    it('should accept isDefault = true', () => {
      const account = BankAccount.create(
        createValidBankAccountProps({ isDefault: true }),
      );
      expect(account.isDefault).toBe(true);
    });

    it('should accept isDefault = false', () => {
      const account = BankAccount.create(
        createValidBankAccountProps({ isDefault: false }),
      );
      expect(account.isDefault).toBe(false);
    });
  });

  describe('getters', () => {
    it('should return bankName as Value Object', () => {
      expect(bankAccount.bankName).toBeInstanceOf(BankName);
      expect(bankAccount.bankName.value).toBe('Vietcombank');
    });

    it('should return accountNo as Value Object', () => {
      expect(bankAccount.accountNo).toBeInstanceOf(BankAccountNumber);
      expect(bankAccount.accountNo.value).toBe('1234567890');
    });

    it('should return accountName as Value Object', () => {
      expect(bankAccount.accountName).toBeInstanceOf(AccountHolderName);
      expect(bankAccount.accountName.value).toBe('Nguyen Van A');
    });

    it('should return isDefault as boolean', () => {
      expect(typeof bankAccount.isDefault).toBe('boolean');
    });

    it('should return createdAt as Date', () => {
      expect(bankAccount.createdAt).toBeInstanceOf(Date);
      expect(bankAccount.createdAt).toBe(fixedDate);
    });
  });

  describe('markAsDefault() / unmarkAsDefault() (internal)', () => {
    it('should mark account as default', () => {
      const account = BankAccount.create(
        createValidBankAccountProps({ isDefault: false }),
      );
      expect(account.isDefault).toBe(false);

      account.markAsDefault();
      expect(account.isDefault).toBe(true);
    });

    it('should unmark account as default', () => {
      const account = BankAccount.create(
        createValidBankAccountProps({ isDefault: true }),
      );
      expect(account.isDefault).toBe(true);

      account.unmarkAsDefault();
      expect(account.isDefault).toBe(false);
    });

    it('should toggle state correctly', () => {
      const account = BankAccount.create(
        createValidBankAccountProps({ isDefault: false }),
      );
      account.markAsDefault();
      expect(account.isDefault).toBe(true);
      account.unmarkAsDefault();
      expect(account.isDefault).toBe(false);
      account.markAsDefault();
      expect(account.isDefault).toBe(true);
    });
  });

  describe('canBeDeleted()', () => {
    it('should return true if account is not default', () => {
      const account = BankAccount.create(
        createValidBankAccountProps({ isDefault: false }),
      );
      expect(account.canBeDeleted()).toBe(true);
    });

    it('should return false if account is default', () => {
      const account = BankAccount.create(
        createValidBankAccountProps({ isDefault: true }),
      );
      expect(account.canBeDeleted()).toBe(false);
    });

    it('should reflect state after mark/unmark', () => {
      const account = BankAccount.create(
        createValidBankAccountProps({ isDefault: false }),
      );
      expect(account.canBeDeleted()).toBe(true);
      account.markAsDefault();
      expect(account.canBeDeleted()).toBe(false);
      account.unmarkAsDefault();
      expect(account.canBeDeleted()).toBe(true);
    });
  });

  describe('equals()', () => {
    it('should return true for same instance', () => {
      expect(bankAccount.equals(bankAccount)).toBe(true);
    });

    it('should return true for different instance with same id', () => {
      const sameIdAccount = BankAccount.create({
        ...createValidBankAccountProps(),
        id: bankAccount.id,
        userId: 'anotheruser',
        bankName: BankName.create('Other'),
        accountNo: BankAccountNumber.create('123456789012'),
        accountName: AccountHolderName.create('Other'),
        isDefault: false,
        createdAt: new Date(),
      });
      expect(bankAccount.equals(sameIdAccount)).toBe(true);
    });

    it('should return false for different id', () => {
      const otherAccount = BankAccount.create(
        createValidBankAccountProps({ id: 'different-id' }),
      );
      expect(bankAccount.equals(otherAccount)).toBe(false);
    });

    it('should return false for non-BankAccount object', () => {
      expect(bankAccount.equals(null as any)).toBe(false);
      expect(bankAccount.equals({} as any)).toBe(false);
      expect(bankAccount.equals(undefined as any)).toBe(false);
    });
  });

  describe('reconstitute()', () => {
    it('should recreate a BankAccount from persistence data', () => {
      const props = createValidBankAccountProps({
        id: 'recon-id',
        userId: 'recon-user',
        bankName: BankName.create('Recon Bank'),
        accountNo: BankAccountNumber.create('111222222'),
        accountName: AccountHolderName.create('Recon Name'),
        isDefault: false,
        createdAt: new Date('2024-12-31'),
      });

      const account = BankAccount.reconstitute(props);
      expect(account.id).toBe(props.id);
      expect(account.userId).toBe(props.userId);
      expect(account.bankName).toBe(props.bankName);
      expect(account.accountNo).toBe(props.accountNo);
      expect(account.accountName).toBe(props.accountName);
      expect(account.isDefault).toBe(props.isDefault);
      expect(account.createdAt).toBe(props.createdAt);
    });

    it('should produce an entity with same behavior as create()', () => {
      const createProps = createValidBankAccountProps();
      const fromCreate = BankAccount.create(createProps);
      const fromReconstitute = BankAccount.reconstitute(createProps);

      expect(fromCreate.equals(fromReconstitute)).toBe(true);
      expect(fromCreate.isDefault).toBe(fromReconstitute.isDefault);
    });
  });

  describe('edge cases', () => {
    it('should allow changing default status via internal methods', () => {
      const account = BankAccount.create(
        createValidBankAccountProps({ isDefault: false }),
      );
      account.markAsDefault();
      expect(account.isDefault).toBe(true);
      account.unmarkAsDefault();
      expect(account.isDefault).toBe(false);
    });

    it('should allow creating with any valid Value Objects', () => {
      const bankName = BankName.create('Ngân hàng TMCP Ngoại thương Việt Nam');
      const accountNo = BankAccountNumber.create('1234567890');
      const accountName = AccountHolderName.create('Nguyễn Văn A');

      const account = BankAccount.create({
        id: 'any-id',
        userId: 'any-user',
        bankName,
        accountNo,
        accountName,
        isDefault: true,
        createdAt: new Date(),
      });

      expect(account.bankName).toBe(bankName);
      expect(account.accountNo).toBe(accountNo);
      expect(account.accountName).toBe(accountName);
    });
  });
});
