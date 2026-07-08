// modules/bank-account/application/contracts/bank-account-contracts.ts

import {
  CreateBankAccountInput,
  UpdateBankAccountInput,
  GetBankAccountsInput,
  BankAccountResponse,
  BankAccountListResponse,
} from '../../interfaces/dtos/bank-account.dto';

export interface ICreateBankAccountUseCase {
  execute(input: CreateBankAccountInput): Promise<BankAccountResponse>;
}

export interface IUpdateBankAccountUseCase {
  execute(
    accountId: string,
    userId: string,
    input: UpdateBankAccountInput,
  ): Promise<BankAccountResponse>;
}

export interface IGetBankAccountsUseCase {
  execute(input: GetBankAccountsInput): Promise<BankAccountListResponse>;
}

export interface IGetDefaultBankAccountUseCase {
  execute(userId: string): Promise<BankAccountResponse | null>;
}

export interface IGetBankAccountByIdUseCase {
  execute(accountId: string, userId: string): Promise<BankAccountResponse>;
}

export interface IDeleteBankAccountUseCase {
  execute(accountId: string, userId: string): Promise<void>;
}

export interface ISetDefaultBankAccountUseCase {
  execute(accountId: string, userId: string): Promise<BankAccountResponse>;
}

export interface IUnsetDefaultBankAccountUseCase {
  execute(accountId: string, userId: string): Promise<BankAccountResponse>;
}

export interface BulkDeleteBankAccountsInput {
  userId: string;
  accountIds: string[];
}

export interface IBulkDeleteBankAccountsUseCase {
  execute(input: BulkDeleteBankAccountsInput): Promise<void>;
}
