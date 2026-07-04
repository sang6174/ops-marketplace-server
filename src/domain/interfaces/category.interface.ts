export interface ICategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly description?: string;
  readonly parentId?: string;
  readonly icon?: string;
  readonly image?: string;
}
