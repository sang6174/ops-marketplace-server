export interface IActivateCategoryUseCase {
  execute(id: string): Promise<void>;
}

export interface IDeactivateCategoryUseCase {
  execute(id: string): Promise<void>;
}
