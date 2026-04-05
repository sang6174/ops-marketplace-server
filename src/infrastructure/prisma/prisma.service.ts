// src/infrastructure/prisma/prisma.service.ts
import { Injectable, Type } from '@nestjs/common';
import { PrismaProvider } from './prisma.provider';

/**
 * ExtendedPrismaClient
 *
 * A dynamic class that wraps PrismaProvider and returns
 * a PrismaClient instance with all extensions applied.
 *
 * This leverages a JavaScript feature where a constructor
 * can return a different object than `this`.
 *
 * @param provider PrismaProvider instance
 * @returns PrismaClient with extensions (exists, softDelete)
 */
const ExtendedPrismaClient = class {
  constructor(provider: PrismaProvider) {
    return provider.withExtensions();
  }
} as Type<ReturnType<PrismaProvider['withExtensions']>>;

/**
 * PrismaService
 *
 * A NestJS injectable service that provides an extended PrismaClient.
 *
 * This service:
 * - Automatically applies Prisma extensions
 * - Is fully type-safe (includes custom methods like `exists`, `softDelete`)
 * - Can be injected directly into other services
 *
 * @example
 * constructor(private prisma: PrismaService) {}
 *
 * await this.prisma.user.exists({ email: 'test@gmail.com' });
 * await this.prisma.user.softDelete({ id: 1 });
 *
 * @extends ExtendedPrismaClient
 */
@Injectable()
export class PrismaService extends ExtendedPrismaClient {
  /**
   * Initializes PrismaService with PrismaProvider
   *
   * @param provider PrismaProvider instance
   */
  constructor(provider: PrismaProvider) {
    super(provider);
  }
}
