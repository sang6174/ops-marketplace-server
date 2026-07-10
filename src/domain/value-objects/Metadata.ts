export class Metadata {
  private constructor(private readonly _value: Record<string, any>) {}

  static create(value: Record<string, any> = {}): Metadata {
    return new Metadata({ ...value });
  }
  get value(): Record<string, any> {
    return { ...this._value };
  }
  set(key: string, val: any): Metadata {
    return new Metadata({ ...this._value, [key]: val });
  }
  equals(other: Metadata): boolean {
    return (
      other instanceof Metadata &&
      JSON.stringify(this._value) === JSON.stringify(other._value)
    );
  }
}
