export class Rating {
  private constructor(public value: number) {
    if (value < 0 || value > 5)
      throw new Error('Rating must be between 0 and 5');
  }

  static fromNumber(value: number): Rating {
    return new Rating(Math.min(5, Math.max(0, value)));
  }

  static average(ratings: Rating[]): Rating {
    if (ratings.length === 0) return new Rating(0);
    const sum = ratings.reduce((acc, r) => acc + r.value, 0);
    return new Rating(sum / ratings.length);
  }

  equals(other: Rating): boolean {
    return this.value === other.value;
  }
}
