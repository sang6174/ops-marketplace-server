// domain/entities/category.ts
export class Category {
  private constructor(
    public readonly id: string,
    private _name: string,
    private _slug: string,
    private _isActive: boolean,
    private _sortOrder: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    private _description?: string,
    private _parentId?: string,
  ) {}

  get name(): string {
    return this._name;
  }

  get slug(): string {
    return this._slug;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get sortOrder(): number {
    return this._sortOrder;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get description(): string | undefined {
    return this._description;
  }

  get parentId(): string | undefined {
    return this._parentId;
  }

  static create(
    name: string,
    slug: string,
    parentId?: string,
    sortOrder: number = 0,
    description?: string,
  ): Category {
    return new Category(
      crypto.randomUUID(),
      name,
      slug,
      true, // isActive
      sortOrder,
      new Date(),
      new Date(),
      description,
      parentId,
    );
  }

  changeName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Category name cannot be empty');
    }
    this._name = newName.trim();
    this._slug = this.generateSlug(newName);
    this._touch();
  }

  changeSlug(newSlug: string): void {
    if (!newSlug || newSlug.trim().length === 0) {
      throw new Error('Slug cannot be empty');
    }
    if (!/^[a-z0-9-]+$/.test(newSlug)) {
      throw new Error(
        'Slug can only contain lowercase letters, numbers, and hyphens',
      );
    }
    this._slug = newSlug.toLowerCase().trim();
    this._touch();
  }

  changeSortOrder(newOrder: number): void {
    if (newOrder < 0) {
      throw new Error('Sort order cannot be negative');
    }
    this._sortOrder = newOrder;
    this._touch();
  }

  changeDescription(newDescription?: string): void {
    this._description = newDescription?.trim() || undefined;
    this._touch();
  }

  changeParent(newParentId?: string): void {
    if (newParentId === this.id) {
      throw new Error('A category cannot be its own parent');
    }
    this._parentId = newParentId;
    this._touch();
  }

  activate(): void {
    if (this._isActive) return;
    this._isActive = true;
    this._touch();
  }

  deactivate(): void {
    if (!this._isActive) return;
    this._isActive = false;
    this._touch();
  }

  isRoot(): boolean {
    return !this._parentId;
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }
}
