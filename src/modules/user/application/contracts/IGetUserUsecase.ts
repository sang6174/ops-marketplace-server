import { User } from '@/domain/entities/identities/User';
import { GetUserInput } from '@modules/user/interfaces/dto/user.dto';

export interface IGetUserUseCase {
  execute(input: GetUserInput): Promise<User>;
}

export interface IGetUserByEmailUseCase {
  execute(email: string): Promise<User | null>;
}
