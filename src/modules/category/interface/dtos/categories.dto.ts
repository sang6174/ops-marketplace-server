export interface CreateCategoryInput {
  name: string;
  slug?: string;
  parentId?: string;
  sortOrder?: number;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  parentId?: string | null;
  sortOrder?: number;
  description?: string | null;
  isActive?: boolean;
}

export interface GetCategoriesInput {
  parentId?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'sortOrder' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

export interface GetCategoryTreeInput {
  rootId?: string;
  includeInactive?: boolean;
  maxDepth?: number;
}

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  description?: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeNode extends CategoryResponse {
  children: CategoryTreeNode[];
}

export interface CategoryListResponse {
  items: CategoryResponse[];
  total: number;
  limit: number;
  offset: number;
}
