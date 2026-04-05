// src/infrastructure/prisma/prisma.provider.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@infrastructure/generated/prisma/client';
import { existsExtension, softDeleteExtension } from './prisma.extension';

/**
 * PrismaProvider
 *
 * A NestJS provider that extends PrismaClient and manages:
 * - Database connection lifecycle
 * - Prisma extensions (exists, soft delete)
 *
 * This provider ensures a singleton-like behavior to prevent
 * multiple database connections in development or hot-reload
 * scenarios.
 *
 * @example
 * constructor(private prisma: PrismaProvider) {}
 *
 * const db = this.prisma.withExtensions();
 * await db.user.exists({ email: 'test@gmail.com' });
 */
@Injectable()
export class PrismaProvider
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Internal flag to prevent multiple connections
   */
  private static initialized = false;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }

  /**
   * Lifecycle hook - called when the module initializes
   *
   * Establishes a database connection if not already connected.
   */
  async onModuleInit() {
    if (!PrismaProvider.initialized) {
      PrismaProvider.initialized = true;
      await this.$connect();
    }
  }

  /**
   * Lifecycle hook - called when the module is destroyed
   *
   * Closes the database connection if it exists.
   */
  async onModuleDestroy() {
    if (PrismaProvider.initialized) {
      PrismaProvider.initialized = false;
      await this.$disconnect();
    }
  }

  /**
   * Returns a PrismaClient instance with custom extensions applied.
   *
   * Extensions included:
   * - exists: check if a record exists
   * - softDelete: soft delete a record via `deletedAt`
   *
   * @example
   * const prisma = this.prisma.withExtensions();
   * await prisma.user.exists({ email: 'test@gmail.com' });
   *
   * @returns Extended PrismaClient instance
   */
  withExtensions() {
    return this.$extends(existsExtension).$extends(softDeleteExtension);
  }
}
