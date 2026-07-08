export interface CreateBankAccountInput {
  userId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  isDefault?: boolean;
}

export interface UpdateBankAccountInput {
  bankName?: string;
  accountNo?: string;
  accountName?: string;
  isDefault?: boolean;
}

export interface GetBankAccountsInput {
  userId: string;
  includeDefaultOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface BankAccountResponse {
  id: string;
  userId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface BankAccountListResponse {
  items: BankAccountResponse[];
  total: number;
  limit: number;
  offset: number;
}
