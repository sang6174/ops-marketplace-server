import { UserId } from '../../value-objects/UserId';
import { Email } from '../../value-objects/Email';
import { PhoneNumber } from '../../value-objects/PhoneNumber';
import { FullName } from '../../value-objects/FullName';
import { UserRole } from '../enums.enum';

export class User {
  private constructor(
    public readonly id: UserId,
    private _email: Email,
    private _fullName: FullName,
    private _phoneNumber: PhoneNumber,
    private _isActive: boolean,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: {
    id: UserId;
    email: Email;
    fullName: FullName;
    phoneNumber: PhoneNumber;
    isActive?: boolean;
    createdAt?: Date;
  }): User {
    const now = props.createdAt || new Date();
    return new User(
      props.id,
      props.email,
      props.fullName,
      props.phoneNumber,
      props.isActive ?? true,
      now,
      now,
    );
  }

  static reconstitute(props: {
    id: UserId;
    email: Email;
    fullName: FullName;
    phoneNumber: PhoneNumber;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      props.id,
      props.email,
      props.fullName,
      props.phoneNumber,
      props.isActive,
      props.createdAt,
      props.updatedAt,
    );
  }

  get email(): Email {
    return this._email;
  }
  get fullName(): FullName {
    return this._fullName;
  }
  get phoneNumber(): PhoneNumber {
    return this._phoneNumber;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  changeEmail(newEmail: Email): void {
    this._email = newEmail;
    this._touch();
  }

  changeFullName(newName: FullName): void {
    this._fullName = newName;
    this._touch();
  }

  changePhoneNumber(newPhone: PhoneNumber): void {
    this._phoneNumber = newPhone;
    this._touch();
  }

  activate(): void {
    if (!this._isActive) {
      this._isActive = true;
      this._touch();
    }
  }

  deactivate(): void {
    if (this._isActive) {
      this._isActive = false;
      this._touch();
    }
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }

  equals(other: User): boolean {
    return this.id.equals(other.id);
  }
}
