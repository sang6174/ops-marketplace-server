export interface IBaseEntity {
  fromDao<T extends object>(this: T, dao: Partial<T>): T;
}
