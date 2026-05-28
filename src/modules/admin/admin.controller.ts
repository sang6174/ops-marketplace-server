// src/module/admin/admin.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser, Roles } from '@common/decorators';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { JwtAuthGuard } from '../auth/guards';
import { AdminService } from './admin.service';
import {
  AssignCategoryAttributesDto,
  CreateAdminCategoryDto,
  FeatureProductDto,
  QueryAdminLedgerEntriesDto,
  QueryAdminOrdersDto,
  QueryAdminPayoutsDto,
  QueryAdminProductsDto,
  QueryAdminShopsDto,
  QueryAdminUsersDto,
  ReorderCategoriesDto,
  UpdateAdminCategoryDto,
  UpdateUserRolesDto,
  UpdateUserStatusDto,
} from './dtos/admin.dto';
import { UserRole } from '@/infrastructure/generated/prisma/enums';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: '[ADMIN] List users' })
  listUsers(@Query() dto: QueryAdminUsersDto) {
    return this.adminService.listUsers(dto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: '[ADMIN] Get user details' })
  getUser(@Param('id') userId: string) {
    return this.adminService.getUser(userId);
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: '[ADMIN] Update user status' })
  updateUserStatus(
    @GetUser() user: AuthUser,
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(user.id, userId, dto);
  }

  @Put('users/:id/roles')
  @ApiOperation({ summary: '[ADMIN] Replace user roles' })
  updateUserRoles(
    @GetUser() user: AuthUser,
    @Param('id') userId: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.adminService.updateUserRoles(user.id, userId, dto);
  }

  @Get('shops')
  @ApiOperation({ summary: '[ADMIN] List shops' })
  listShops(@Query() dto: QueryAdminShopsDto) {
    return this.adminService.listShops(dto);
  }

  @Put('shops/:id/verify')
  @ApiOperation({ summary: '[ADMIN] Verify shop' })
  verifyShop(@GetUser() user: AuthUser, @Param('id') shopId: string) {
    return this.adminService.verifyShop(user.id, shopId);
  }

  @Put('shops/:id/suspend')
  @ApiOperation({ summary: '[ADMIN] Suspend shop' })
  suspendShop(@GetUser() user: AuthUser, @Param('id') shopId: string) {
    return this.adminService.suspendShop(user.id, shopId);
  }

  @Post('categories')
  @ApiOperation({ summary: '[ADMIN] Create category' })
  createCategory(@Body() dto: CreateAdminCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Put('categories/reorder')
  @ApiOperation({ summary: '[ADMIN] Reorder categories' })
  reorderCategories(@Body() dto: ReorderCategoriesDto) {
    return this.adminService.reorderCategories(dto);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: '[ADMIN] Update category' })
  updateCategory(
    @Param('id') categoryId: string,
    @Body() dto: UpdateAdminCategoryDto,
  ) {
    return this.adminService.updateCategory(categoryId, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: '[ADMIN] Delete category' })
  deleteCategory(@Param('id') categoryId: string) {
    return this.adminService.deleteCategory(categoryId);
  }

  @Post('categories/:id/attributes')
  @ApiOperation({ summary: '[ADMIN] Assign attributes to category' })
  assignCategoryAttributes(
    @Param('id') categoryId: string,
    @Body() dto: AssignCategoryAttributesDto,
  ) {
    return this.adminService.assignCategoryAttributes(categoryId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: '[ADMIN] List orders' })
  listOrders(@Query() dto: QueryAdminOrdersDto) {
    return this.adminService.listOrders(dto);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: '[ADMIN] Get order details' })
  getOrder(@Param('id') orderId: string) {
    return this.adminService.getOrder(orderId);
  }

  @Get('products')
  @ApiOperation({ summary: '[ADMIN] List products' })
  listProducts(@Query() dto: QueryAdminProductsDto) {
    return this.adminService.listProducts(dto);
  }

  @Put('products/:id/feature')
  @ApiOperation({ summary: '[ADMIN] Feature product' })
  featureProduct(
    @Param('id') productId: string,
    @Body() dto: FeatureProductDto,
  ) {
    return this.adminService.featureProduct(productId, dto);
  }

  @Get('ledger/accounts')
  @ApiOperation({ summary: '[ADMIN] List ledger accounts' })
  listLedgerAccounts() {
    return this.adminService.listLedgerAccounts();
  }

  @Get('ledger/entries')
  @ApiOperation({ summary: '[ADMIN] List ledger entries' })
  listLedgerEntries(@Query() dto: QueryAdminLedgerEntriesDto) {
    return this.adminService.listLedgerEntries(dto);
  }

  @Get('ledger/balance')
  @ApiOperation({ summary: '[ADMIN] Platform balance overview' })
  getLedgerBalance() {
    return this.adminService.getLedgerBalance();
  }

  @Get('payouts')
  @ApiOperation({ summary: '[ADMIN] List payouts' })
  listPayouts(@Query() dto: QueryAdminPayoutsDto) {
    return this.adminService.listPayouts(dto);
  }

  @Put('payouts/:id/process')
  @ApiOperation({ summary: '[ADMIN] Process payout successfully' })
  processPayout(@GetUser() user: AuthUser, @Param('id') payoutId: string) {
    return this.adminService.processPayout(user.id, payoutId);
  }

  @Put('payouts/:id/fail')
  @ApiOperation({ summary: '[ADMIN] Mark payout as failed' })
  failPayout(@GetUser() user: AuthUser, @Param('id') payoutId: string) {
    return this.adminService.failPayout(user.id, payoutId);
  }

  @Get('statements/reconciliation')
  @ApiOperation({ summary: '[ADMIN] Bank reconciliation overview' })
  getReconciliation() {
    return this.adminService.getReconciliation();
  }
}
