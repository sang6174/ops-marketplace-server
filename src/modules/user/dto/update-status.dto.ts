import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@infrastructure/generated/prisma/enums';

export class UpdateUserStatusDto {
  @IsEnum(AccountStatus, { message: 'Invalid status' })
  @ApiProperty({ example: 'PENDING' })
  status!: AccountStatus;
}
