export class Location {
  private constructor(
    public readonly lat: number,
    public readonly lng: number,
  ) {
    if (lat < -90 || lat > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    if (lng < -180 || lng > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
  }

  static create(lat: number, lng: number): Location {
    return new Location(lat, lng);
  }

  static unknown(): Location {
    return new Location(0, 0);
  }

  equals(other: Location): boolean {
    return (
      other instanceof Location &&
      this.lat === other.lat &&
      this.lng === other.lng
    );
  }

  toString(): string {
    return `${this.lat},${this.lng}`;
  }
}
