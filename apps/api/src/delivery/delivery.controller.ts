import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Roles, type AuthRequest } from "../auth/auth.guard";
import { fail } from "../common/api-error";
import { FieldService } from "../workflow/field.service";
@Controller()
@UseGuards(AuthGuard)
export class DeliveryController {
  constructor(private readonly field: FieldService) {}
  @Post("trips/:id/depart") @HttpCode(200) @Roles("DRIVER") depart(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.field.depart(r.user, id, b);
  }
  @Post("stops/:id/arrive") @HttpCode(200) @Roles("DRIVER") arrive(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.field.direct(r.user, "ARRIVE", id, b);
  }
  @Post("stops/:id/outcome") @Roles("DRIVER") outcome(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.field.direct(r.user, "OUTCOME", id, b);
  }
  @Get("deliveries/:id") delivery(
    @Req() r: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.field.getDelivery(r.user, id);
  }
  @Post("deliveries/:id/review") @HttpCode(200) @Roles("DISPATCHER") review(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.field.review(r.user, id, b);
  }
  @Post("driver/issues") @Roles("DRIVER") async reportIssue(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    const result = await this.field.issue(r.user, b);
    if (result.status === "CONFLICT")
      fail(409, "STALE_PLAN", "Incident preserved for Dispatcher review.", [
        {
          code: "STALE_PLAN",
          message: "Recorded incident needs reconciliation.",
          field: "expectedPlanVersion",
          entityId: result.conflictId,
        },
      ]);
    return result.value;
  }
  @Get("trips/:id/issues") @Roles("DRIVER", "DISPATCHER") issues(
    @Req() r: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.field.issues(r.user, id);
  }
}
