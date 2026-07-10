export class Gateway {
  private constructor(public readonly name: string) {}
  static create(name: string): Gateway {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error('Gateway name cannot be empty');
    return new Gateway(trimmed);
  }
  equals(other: Gateway): boolean {
    return other instanceof Gateway && this.name === other.name;
  }
}
