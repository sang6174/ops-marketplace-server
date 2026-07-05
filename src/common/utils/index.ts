import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

export const getRequestId = (request: Request): string => {
  const existingRequestId = request.headers['x-request-id'];
  if (typeof existingRequestId === 'string') {
    return existingRequestId;
  }
  return uuidv4();
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export interface PaginationOptions {
  page: number;
  limit: number;
  skip?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const toPrismaPage = (
  page: number,
  limit: number,
): { skip: number; take: number } => {
  const skip = Math.max(0, (page - 1) * limit);
  return { skip, take: limit };
};

export const exclude = <T>(
  obj: T,
  keys: (keyof T)[],
): Partial<T> => {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
};

export const maskSensitiveData = (
  data: any,
  sensitiveFields: string[] = [
    'password',
    'passwordConfirmation',
    'token',
    'refreshToken',
    'secret',
    'authorization',
    'apiKey',
    'creditCard',
    'ssn',
  ],
): any => {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') return data;

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, sensitiveFields));
  }

  if (typeof data === 'object') {
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        masked[key] = '[FILTERED]';
      } else {
        masked[key] = maskSensitiveData(value, sensitiveFields);
      }
    }
    return masked;
  }

  return data;
};
