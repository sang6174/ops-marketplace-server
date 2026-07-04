export class Category {
  private constructor(
    public readonly id: string,
    public name: string,
    public slug: string, 
    public isActive: boolean,
    public sortOrder: number, 
    public createdAt: Date,
    public updatedAt: Date,
    public description?: string,
    public parentId?: string,
    public icon?: string, 
    public image?: string, 
  ) {}
}
