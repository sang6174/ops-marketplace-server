import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards';
import { Public } from '@common/decorators';
import { LedgerService } from './ledger.service';
import {
  CreateLedgerAccountDto,
  RecordLedgerEntryDto,
  QueryLedgerEntriesDto,
} from './dtos/ledger.dto';

@ApiTags('Ledger')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Public()
  @Get('accounts/:accountId')
  @ApiOperation({ summary: 'Get ledger account details' })
  getAccount(@Param('accountId') accountId: string) {
    return this.ledgerService.getAccount(accountId);
  }

  @Public()
  @Get('accounts/:accountId/balance')
  @ApiOperation({ summary: 'Get account balance' })
  getBalance(@Param('accountId') accountId: string) {
    return this.ledgerService.getBalance(accountId);
  }

  @Public()
  @Get('entries')
  @ApiOperation({ summary: 'List all ledger entries' })
  listEntries(@Query() dto: QueryLedgerEntriesDto) {
    return this.ledgerService.listEntries(dto);
  }

  @Public()
  @Get('accounts/:accountId/entries')
  @ApiOperation({ summary: 'Get entries for a specific account' })
  getEntriesByAccount(
    @Param('accountId') accountId: string,
    @Query() dto: QueryLedgerEntriesDto,
  ) {
    return this.ledgerService.getEntriesByAccount(accountId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post('entries')
  @ApiOperation({ summary: 'Record a new ledger entry' })
  recordEntry(@Body() dto: RecordLedgerEntryDto) {
    return this.ledgerService.recordEntry(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post('entries/:entryId/reverse')
  @ApiOperation({ summary: 'Reverse a ledger entry' })
  reverseEntry(
    @Param('entryId') entryId: string,
    @Body('reason') reason: string,
  ) {
    return this.ledgerService.reverseEntry(entryId, reason);
  }
}
