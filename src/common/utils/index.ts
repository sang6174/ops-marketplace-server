// src/common/utils/index.ts
import * as bcrypt from 'bcrypt';
import { SALT_ROUNDS } from '../constants';

// ===== Password =====

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

// ===== exclude =====

export function exclude<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>;
}

// ===== skip/take =====

export function toPrismaPage(page: number, limit: number) {
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit));

  return {
    skip: (validPage - 1) * validLimit,
    take: validLimit,
  };
}
