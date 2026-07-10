import { UserId } from '../../value-objects/UserId';
import { SubAdminRole } from '../enums.enum';

export class AdminProfile {
  private constructor(
    public readonly id: string,
    public readonly userId: UserId,
    private _subRole: SubAdminRole,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: {
    id: string;
    userId: UserId;
    subRole: SubAdminRole;
    createdAt?: Date;
  }): AdminProfile {
    const now = props.createdAt || new Date();
    return new AdminProfile(props.id, props.userId, props.subRole, now, now);
  }

  static reconstitute(props: {
    id: string;
    userId: UserId;
    subRole: SubAdminRole;
    createdAt: Date;
    updatedAt: Date;
  }): AdminProfile {
    return new AdminProfile(
      props.id,
      props.userId,
      props.subRole,
      props.createdAt,
      props.updatedAt,
    );
  }

  get subRole(): SubAdminRole {
    return this._subRole;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  changeSubRole(newRole: SubAdminRole): void {
    this._subRole = newRole;
    this._touch();
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }
}
