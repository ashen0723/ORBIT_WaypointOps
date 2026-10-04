import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderPolicyService } from './order-policy.service';
import { JwtAuthGuard, StoreManagerGuard } from '../auth/auth.guard';
import { CurrentUser, RequestUser } from '../auth/request-user';
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService, private readonly policy: OrderPolicyService) {}
  @Get() list(@CurrentUser() user: RequestUser, @Query() query: Record<string, unknown>) { return this.orders.list(user, query); }
  @Get('catalog') @UseGuards(StoreManagerGuard)
  catalog(@CurrentUser() user: RequestUser) { return this.orders.catalog(user); }
  @Get('policy') @UseGuards(StoreManagerGuard)
  policyInfo() { return this.policy.scheduling(); }
  @Get(':id') findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.orders.findOne(user, id); }
  @Post() @UseGuards(StoreManagerGuard)
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) { return this.orders.create(user, body); }
}
