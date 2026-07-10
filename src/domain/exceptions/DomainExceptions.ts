export abstract class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BankAccountNotFoundException extends DomainException {
  constructor(accountId: string) {
    super(`Bank account with id ${accountId} not found`);
  }
}

export class DuplicateDefaultAccountException extends DomainException {
  constructor() {
    super('Only one default bank account is allowed per user');
  }
}
