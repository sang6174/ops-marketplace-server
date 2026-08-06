import { IBaseRepository } from '@domain/repository-contracts/base-repository.interface';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

export abstract class BasePrismaRepository<
  ModelName extends string,
  Entity extends { id: string },
> implements IBaseRepository<Entity> {
  protected abstract readonly modelName: ModelName;

  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Entity | null> {
    const record = await this.model().findUnique({ where: { id } });
    return record ?? null;
  }

  async save(entity: Entity): Promise<Entity> {
    return this.model().upsert({
      where: { id: entity.id },
      create: entity,
      update: entity,
    });
  }

  async delete(id: string): Promise<void> {
    await this.model().softDelete({ where: { id } });
  }

  private model(): any {
    return (this.prisma as any)[this.modelName];
  }
}
