import { User } from '@/domain/entities/identities/User';
import {
  AddRoleInput,
  RemoveRoleInput,
} from '@modules/user/interfaces/dto/user.dto';

export interface IAddRoleUseCase {
  execute(input: AddRoleInput): Promise<User>;
}

export interface IRemoveRoleUseCase {
  execute(input: RemoveRoleInput): Promise<User>;
}
