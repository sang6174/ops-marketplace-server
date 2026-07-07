export class Shop {
  private constructor(
    public readonly id: string,
    public readonly ownerId: string,
    private _name: string,
    private _description: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    private _deletedAt: Date | null,
  ) {}

  static create(props: {
    ownerId: string;
    name: string;
    description?: string;
  }): Shop {
    return new Shop(
      crypto.randomUUID(),
      props.ownerId,
      props.name,
      props.description || null,
      new Date(),
      new Date(),
      null,
    );
  }

  get name(): string {
    return this._name;
  }
  get description(): string | null {
    return this._description;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  updateInfo(name: string, description?: string): void {
    this._name = name;
    this._description = description || null;
    this._touch();
  }

  softDelete(): void {
    if (this._deletedAt) return;
    this._deletedAt = new Date();
    this._touch();
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }

  equals(other: Shop): boolean {
    if (!(other instanceof Shop)) {
      return false;
    }
    return this.id === other.id;
  }
}
