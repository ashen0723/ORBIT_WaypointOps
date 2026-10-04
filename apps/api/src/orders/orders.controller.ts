import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Roles, type AuthRequest } from "../auth/auth.guard";
import { ConnectedOrdersService } from "../workflow/orders.service";
import { OrderPolicyService } from "./order-policy.service";
@Controller("orders")
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(
    private readonly orders: ConnectedOrdersService,
    private readonly policy: OrderPolicyService,
  ) {}
  @Get()
  @Roles("STORE_MANAGER", "DISPATCHER")
  list(@Req() r: AuthRequest, @Query() q: Record<string, unknown>) {
    return this.orders.orders(r.user, q);
  }
  @Get("catalog")
  @Roles("STORE_MANAGER")
  catalog(@Req() r: AuthRequest, @Query() q: Record<string, unknown>) {
    return this.orders.catalog(r.user, q);
  }
  @Get("policy")
  @Roles("STORE_MANAGER")
  policyInfo(@Req() r: AuthRequest, @Query() q: Record<string, unknown>) {
    return this.policy.scheduling(r.user, q);
  }
  @Get(":id")
  findOne(@Req() r: AuthRequest, @Param("id") id: string) {
    return this.orders.get(r.user, id);
  }
  @Post()
  @Roles("STORE_MANAGER")
  create(@Req() r: AuthRequest, @Body() b: unknown) {
    return this.orders.create(r.user, b);
  }
}
