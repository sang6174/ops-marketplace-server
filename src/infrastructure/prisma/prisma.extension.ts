// src/infrastructure/prisma/prisma.extension.ts

/**
 * Prisma Extensions
 *
 * This file defines custom Prisma Client extensions to enhance model capabilities.
 *
 * Extensions:
 * - exists: Check if a record exists (similar to SQL EXISTS)
 * - softDelete: Perform soft delete by setting `deletedAt`
 *
 * Requirements:
 * - All models using softDelete must have a nullable `deletedAt: DateTime?` field
 */
import { Prisma } from '@infrastructure/generated/prisma/client';

/**
 * Adds `exists` method to all Prisma models.
 *
 * @example
 * const exists = await prisma.user.exists({
 *   email: 'test@gmail.com',
 * });
 *
 * @description
 * Equivalent to SQL:
 * SELECT EXISTS(SELECT 1 FROM table WHERE ...);
 *
 * @returns boolean - true if at least one record matches the condition
 */
export const existsExtension = Prisma.defineExtension({
  name: 'exists-extension',
  model: {
    $allModels: {
      async exists<T>(
        this: T,
        where: Prisma.Args<T, 'findFirst'>['where'],
      ): Promise<boolean> {
        const context = Prisma.getExtensionContext(this) as any;
        const count = await context['count']({
          where,
        } as Prisma.Args<T, 'count'>);
        return !!count;
      },
    },
  },
});

/**
 * Adds `softDelete` method to all Prisma models.
 *
 * @example
 * await prisma.user.softDelete({
 *   id: 1,
 * });
 *
 * @description
 * Performs a soft delete by updating `deletedAt` field.
 *
 * Equivalent to SQL:
 * UPDATE table SET deleted_at = NOW() WHERE ...;
 *
 * @returns Updated record
 *
 * @warning
 * Model must include:
 *   deletedAt DateTime?
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'soft-delete-extension',
  model: {
    $allModels: {
      async softDelete<T>(
        this: T,
        where: Prisma.Args<T, 'update'>['where'],
      ): Promise<Prisma.Result<T, unknown, 'update'>> {
        const context = Prisma.getExtensionContext(this) as any;
        return context['update']({
          where,
          data: {
            deletedAt: new Date(),
          },
        } as Prisma.Args<T, 'update'>);
      },
    },
  },
});
