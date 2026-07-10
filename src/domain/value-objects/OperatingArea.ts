import { AdministrativeDivision } from './AdministrativeDivision';

export class OperatingAreas {
  private constructor(private readonly _areas: AdministrativeDivision[]) {
    const unique = this._areas.filter(
      (area, index, self) => self.findIndex((a) => a.equals(area)) === index,
    );
    if (unique.length > 50) {
      throw new Error('Operating areas cannot exceed 50 divisions');
    }
    this._areas = unique;
  }

  static create(areas: AdministrativeDivision[]): OperatingAreas {
    return new OperatingAreas(areas);
  }

  get areas(): AdministrativeDivision[] {
    return [...this._areas];
  }

  add(area: AdministrativeDivision): OperatingAreas {
    if (this._areas.some((a) => a.equals(area))) {
      return this;
    }
    return new OperatingAreas([...this._areas, area]);
  }

  remove(area: AdministrativeDivision): OperatingAreas {
    return new OperatingAreas(this._areas.filter((a) => !a.equals(area)));
  }

  includes(area: AdministrativeDivision): boolean {
    return this._areas.some((a) => a.equals(area));
  }

  equals(other: OperatingAreas): boolean {
    if (!(other instanceof OperatingAreas)) return false;
    return (
      this._areas.length === other._areas.length &&
      this._areas.every((a, i) => a.equals(other._areas[i]))
    );
  }
}
