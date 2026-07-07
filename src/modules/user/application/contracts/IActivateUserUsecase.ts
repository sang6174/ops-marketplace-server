export interface ActivateUserInput {
  userId: string;
}

export interface DeactivateUserInput {
  userId: string;
}

export interface IActivateUserUseCase {
  execute(input: ActivateUserInput): Promise<void>;
}

export interface IDeactivateUserUseCase {
  execute(input: DeactivateUserInput): Promise<void>;
}
