export interface DeleteShopInput {
  shopId: string;
  ownerId: string;
}

export interface IDeleteShopUseCase {
  execute(input: DeleteShopInput): Promise<void>;
}