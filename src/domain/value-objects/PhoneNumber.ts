export class PhoneNumber {
  private constructor(public readonly value: string) {
    const regex = /^(\+84|0)[0-9]{9,10}$/;
    if (!regex.test(value)) throw new Error('Invalid phone number');
  }

  static create(value: string): PhoneNumber {
    return new PhoneNumber(value);
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }
}
