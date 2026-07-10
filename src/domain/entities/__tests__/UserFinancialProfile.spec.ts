import { describe, it, expect, beforeEach } from '@jest/globals';
import { UserFinancialProfile } from '@domain/entities/financial/UserFinancialProfile';
import { BankAccount } from '../financial/BankAccount';
import { BankName } from '../../value-objects/BankName';
import { BankAccountNumber } from '../../value-objects/BankAccountNumber';
import { AccountHolderName } from '../../value-objects/BankAccountHolderName';
import { BankAccountNotFoundException } from '../../exceptions/DomainExceptions';

function createBankAccount(params: {
  id?: string;
  userId?: string;
  bankName?: string;
  accountNo?: string;
  accountName?: string;
  isDefault?: boolean;
  createdAt?: Date;
}): BankAccount {
  const {
    id = 'acc-' + Math.random().toString(36).slice(2, 6),
    userId = 'user-123',
    bankName = 'Vietcombank',
    accountNo = '1234567890',
    accountName = 'Nguyen Van A',
    isDefault = false,
    createdAt = new Date('2025-01-01T00:00:00.000Z'),
  } = params;

  return BankAccount.create({
    id,
    userId,
    bankName: BankName.create(bankName),
    accountNo: BankAccountNumber.create(accountNo),
    accountName: AccountHolderName.create(accountName),
    isDefault,
    createdAt,
  });
}

function createProfileWithAccounts(
  accounts: BankAccount[],
): UserFinancialProfile {
  return UserFinancialProfile.reconstitute({
    userId: 'user-123',
    accounts,
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  });
}

describe('UserFinancialProfile Aggregate Root', () => {
  let defaultAccount: BankAccount;
  let secondAccount: BankAccount;
  let thirdAccount: BankAccount;
  let profile: UserFinancialProfile;

  beforeEach(() => {
    defaultAccount = createBankAccount({
      id: 'acc-default',
      isDefault: true,
    });
    secondAccount = createBankAccount({
      id: 'acc-2',
      isDefault: false,
    });
    thirdAccount = createBankAccount({
      id: 'acc-3',
      isDefault: false,
    });

    profile = createProfileWithAccounts([
      defaultAccount,
      secondAccount,
      thirdAccount,
    ]);
  });

  describe('reconstitute()', () => {
    it('should recreate profile with accounts', () => {
      const accounts = [defaultAccount, secondAccount];
      const updatedAt = new Date('2024-12-31');

      const profile = UserFinancialProfile.reconstitute({
        userId: 'user-123',
        accounts,
        updatedAt,
      });

      expect(profile.userId).toBe('user-123');
      expect(profile.accounts).toHaveLength(2);
      expect(profile.accounts).toContain(defaultAccount);
      expect(profile.accounts).toContain(secondAccount);
      expect(profile.getDefaultAccount()).toBe(defaultAccount);
    });

    it('should accept empty account list', () => {
      const profile = UserFinancialProfile.reconstitute({
        userId: 'user-123',
        accounts: [],
        updatedAt: new Date(),
      });
      expect(profile.accounts).toHaveLength(0);
      expect(profile.getDefaultAccount()).toBeUndefined();
    });
  });

  describe('getDefaultAccount()', () => {
    it('should return the default account when exists', () => {
      expect(profile.getDefaultAccount()).toBe(defaultAccount);
    });

    it('should return undefined when no account is default', () => {
      const nonDefault1 = createBankAccount({ isDefault: false });
      const nonDefault2 = createBankAccount({ isDefault: false });
      const profileNoDefault = createProfileWithAccounts([
        nonDefault1,
        nonDefault2,
      ]);

      expect(profileNoDefault.getDefaultAccount()).toBeUndefined();
    });

    it('should return undefined when account list is empty', () => {
      const emptyProfile = UserFinancialProfile.reconstitute({
        userId: 'user-123',
        accounts: [],
        updatedAt: new Date(),
      });
      expect(emptyProfile.getDefaultAccount()).toBeUndefined();
    });
  });

  describe('addBankAccount()', () => {
    it('should add a new account with isDefault=false', () => {
      const newAccount = createBankAccount({
        id: 'new-acc',
        isDefault: false,
      });

      profile.addBankAccount(newAccount);

      expect(profile.accounts).toHaveLength(4);
      expect(profile.accounts).toContain(newAccount);
      expect(profile.getDefaultAccount()).toBe(defaultAccount);
      expect(newAccount.isDefault).toBe(false);
    });

    it('should add a new account with isDefault=true and unmark old default', () => {
      const newAccount = createBankAccount({
        id: 'new-default',
        isDefault: true,
      });

      profile.addBankAccount(newAccount);

      expect(profile.accounts).toHaveLength(4);
      expect(profile.accounts).toContain(newAccount);
      expect(profile.getDefaultAccount()).toBe(newAccount);
      expect(defaultAccount.isDefault).toBe(false);
      expect(secondAccount.isDefault).toBe(false);
      expect(thirdAccount.isDefault).toBe(false);
    });

    it('should automatically set the first account as default when adding while no default exists', () => {
      const nonDefault1 = createBankAccount({ isDefault: false });
      const nonDefault2 = createBankAccount({ isDefault: false });
      const profileNoDefault = createProfileWithAccounts([
        nonDefault1,
        nonDefault2,
      ]);
      expect(profileNoDefault.getDefaultAccount()).toBeUndefined();

      const newAccount = createBankAccount({ isDefault: false });
      profileNoDefault.addBankAccount(newAccount);

      const emptyProfile = UserFinancialProfile.reconstitute({
        userId: 'user-123',
        accounts: [],
        updatedAt: new Date(),
      });
      const firstAccount = createBankAccount({ isDefault: false });
      emptyProfile.addBankAccount(firstAccount);
      expect(emptyProfile.getDefaultAccount()).toBe(firstAccount);
    });

    it('should throw error when adding account with duplicate id', () => {
      const duplicateAccount = createBankAccount({
        id: defaultAccount.id,
        isDefault: false,
      });

      expect(() => profile.addBankAccount(duplicateAccount)).toThrow(
        'Account already exists',
      );
    });

    it('should keep existing default if new account is not default', () => {
      const newAccount = createBankAccount({ isDefault: false });
      profile.addBankAccount(newAccount);
      expect(profile.getDefaultAccount()).toBe(defaultAccount);
    });
  });

  describe('setDefaultBankAccount()', () => {
    it('should set the specified account as default and unmark old default', () => {
      expect(profile.getDefaultAccount()).toBe(defaultAccount);

      profile.setDefaultBankAccount(
        secondAccount.id,
        new Date('2025-02-01T00:00:00.000Z'),
      );

      expect(profile.getDefaultAccount()).toBe(secondAccount);
      expect(defaultAccount.isDefault).toBe(false);
      expect(secondAccount.isDefault).toBe(true);
      expect(thirdAccount.isDefault).toBe(false);
    });

    it('should work when setting the same account that is already default (no change)', () => {
      expect(profile.getDefaultAccount()).toBe(defaultAccount);

      profile.setDefaultBankAccount(
        defaultAccount.id,
        new Date('2025-02-01T00:00:00.000Z'),
      );

      expect(profile.getDefaultAccount()).toBe(defaultAccount);
      expect(defaultAccount.isDefault).toBe(true);
      expect(secondAccount.isDefault).toBe(false);
      expect(thirdAccount.isDefault).toBe(false);
    });

    it('should throw BankAccountNotFoundException if account id not found', () => {
      const nonExistentId = 'non-existent-id';
      expect(() =>
        profile.setDefaultBankAccount(
          nonExistentId,
          new Date('2025-02-01T00:00:00.000Z'),
        ),
      ).toThrow(BankAccountNotFoundException);
      expect(() =>
        profile.setDefaultBankAccount(
          nonExistentId,
          new Date('2025-02-01T00:00:00.000Z'),
        ),
      ).toThrow(`Bank account with id ${nonExistentId} not found`);
    });

    it('should correctly unmark all other accounts when setting new default', () => {
      const acc4 = createBankAccount({ isDefault: false });
      const acc5 = createBankAccount({ isDefault: false });
      profile = createProfileWithAccounts([
        defaultAccount,
        secondAccount,
        thirdAccount,
        acc4,
        acc5,
      ]);

      profile.setDefaultBankAccount(
        acc4.id,
        new Date('2025-02-01T00:00:00.000Z'),
      );

      expect(profile.getDefaultAccount()).toBe(acc4);
      expect(defaultAccount.isDefault).toBe(false);
      expect(secondAccount.isDefault).toBe(false);
      expect(thirdAccount.isDefault).toBe(false);
      expect(acc4.isDefault).toBe(true);
      expect(acc5.isDefault).toBe(false);
    });
  });

  describe('removeBankAccount()', () => {
    it('should remove a non-default account successfully', () => {
      expect(profile.accounts).toHaveLength(3);

      profile.removeBankAccount(secondAccount.id);

      expect(profile.accounts).toHaveLength(2);
      expect(profile.accounts).not.toContain(secondAccount);
      expect(profile.getDefaultAccount()).toBe(defaultAccount);
      expect(defaultAccount.isDefault).toBe(true);
    });

    it('should throw error when trying to remove default account', () => {
      expect(() => profile.removeBankAccount(defaultAccount.id)).toThrow(
        'Cannot delete default bank account',
      );
      expect(profile.accounts).toHaveLength(3);
      expect(profile.getDefaultAccount()).toBe(defaultAccount);
    });

    it('should automatically set the first remaining account as default after removing the only default (if allowed)', () => {
      const singleDefault = createBankAccount({ isDefault: true });
      const profileSingle = createProfileWithAccounts([singleDefault]);
      const nonDefault1 = createBankAccount({ isDefault: false });
      const profile2 = createProfileWithAccounts([defaultAccount, nonDefault1]);

      profile2.removeBankAccount(nonDefault1.id);
      expect(profile2.accounts).toHaveLength(1);
      expect(profile2.getDefaultAccount()).toBe(defaultAccount);
    });

    it('should throw BankAccountNotFoundException if account id not found', () => {
      const nonExistentId = 'non-existent-id';
      expect(() => profile.removeBankAccount(nonExistentId)).toThrow(
        BankAccountNotFoundException,
      );
      expect(() => profile.removeBankAccount(nonExistentId)).toThrow(
        `Bank account with id ${nonExistentId} not found`,
      );
    });

    it('should not affect other accounts when removing a non-default', () => {
      profile.removeBankAccount(secondAccount.id);
      expect(profile.accounts).toContain(defaultAccount);
      expect(profile.accounts).toContain(thirdAccount);
      expect(defaultAccount.isDefault).toBe(true);
      expect(thirdAccount.isDefault).toBe(false);
    });

    it('should allow setting new default after removing old non-defaults', () => {
      profile.removeBankAccount(secondAccount.id);
      profile.setDefaultBankAccount(
        thirdAccount.id,
        new Date('2025-02-01T00:00:00.000Z'),
      );
      expect(profile.getDefaultAccount()).toBe(thirdAccount);
      expect(defaultAccount.isDefault).toBe(false);
      expect(thirdAccount.isDefault).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple operations in sequence correctly', () => {
      const acc4 = createBankAccount({ isDefault: false });
      profile.addBankAccount(acc4);
      expect(profile.accounts).toHaveLength(4);
      expect(profile.getDefaultAccount()).toBe(defaultAccount);

      const acc5 = createBankAccount({ isDefault: true });
      profile.addBankAccount(acc5);
      expect(profile.getDefaultAccount()).toBe(acc5);
      expect(defaultAccount.isDefault).toBe(false);
      expect(acc5.isDefault).toBe(true);

      profile.setDefaultBankAccount(
        defaultAccount.id,
        new Date('2025-02-01T00:00:00.000Z'),
      );
      expect(profile.getDefaultAccount()).toBe(defaultAccount);
      expect(acc5.isDefault).toBe(false);
      expect(defaultAccount.isDefault).toBe(true);

      profile.removeBankAccount(secondAccount.id);
      expect(profile.accounts).toHaveLength(4);
      expect(profile.accounts).not.toContain(secondAccount);

      expect(() => profile.removeBankAccount(defaultAccount.id)).toThrow(
        'Cannot delete default bank account',
      );

      expect(profile.getDefaultAccount()).toBe(defaultAccount);
    });

    it('should handle adding an account with default=true when no default exists', () => {
      const accNonDefault1 = createBankAccount({ isDefault: false });
      const accNonDefault2 = createBankAccount({ isDefault: false });
      const profileNoDefault = createProfileWithAccounts([
        accNonDefault1,
        accNonDefault2,
      ]);
      expect(profileNoDefault.getDefaultAccount()).toBeUndefined();

      const newDefault = createBankAccount({ isDefault: true });
      profileNoDefault.addBankAccount(newDefault);
      expect(profileNoDefault.getDefaultAccount()).toBe(newDefault);
      expect(newDefault.isDefault).toBe(true);
      expect(accNonDefault1.isDefault).toBe(false);
      expect(accNonDefault2.isDefault).toBe(false);
    });
  });

  describe('edge cases and validation', () => {
    it('should maintain accounts order when adding', () => {
      const initialAccounts = [defaultAccount, secondAccount];
      const profile = createProfileWithAccounts(initialAccounts);

      const newAccount = createBankAccount({ id: 'new' });
      profile.addBankAccount(newAccount);

      expect(profile.accounts).toEqual([
        defaultAccount,
        secondAccount,
        newAccount,
      ]);
    });

    it('should not mutate original account list when passed to reconstitute', () => {
      const accounts = [defaultAccount, secondAccount];
      const profile = UserFinancialProfile.reconstitute({
        userId: 'user-123',
        accounts,
        updatedAt: new Date(),
      });

      accounts.push(thirdAccount);
      expect(profile.accounts).toHaveLength(2);
    });

    it('should ensure only one default account at all times after operations', () => {
      const default1 = createBankAccount({ isDefault: true });
      const default2 = createBankAccount({ isDefault: true });
      const default3 = createBankAccount({ isDefault: true });

      const profile = createProfileWithAccounts([default1, default2, default3]);

      const cleanProfile = UserFinancialProfile.reconstitute({
        userId: 'user-123',
        accounts: [],
        updatedAt: new Date(),
      });
      const acc1 = createBankAccount({ isDefault: true });
      const acc2 = createBankAccount({ isDefault: true });
      cleanProfile.addBankAccount(acc1);
      cleanProfile.addBankAccount(acc2);

      expect(cleanProfile.getDefaultAccount()).toBe(acc2);
      expect(acc1.isDefault).toBe(false);
      expect(acc2.isDefault).toBe(true);
    });
  });
});
