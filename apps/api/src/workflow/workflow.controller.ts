import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { AuthGuard, Roles, type AuthRequest } from "../auth/auth.guard";
import { ConnectedOrdersService } from "./orders.service";
import { FieldService, type UploadedEvidence } from "./field.service";
import { PlanningService } from "../planning/planning.service";
@Controller()
@UseGuards(AuthGuard)
export class WorkflowController {
  constructor(
    private readonly orders: ConnectedOrdersService,
    private readonly field: FieldService,
    private readonly planning: PlanningService,
  ) {}
  @Get("catalog") @Roles("STORE_MANAGER") catalog(
    @Req() r: AuthRequest,
    @Query() q: Record<string, unknown>,
  ) {
    return this.orders.catalog(r.user, q);
  }
  @Get("store/orders") @Roles("STORE_MANAGER") store(
    @Req() r: AuthRequest,
    @Query() q: Record<string, unknown>,
  ) {
    return this.orders.orders(r.user, q);
  }
  @Get("dispatcher/orders") @Roles("DISPATCHER") dispatcher(
    @Req() r: AuthRequest,
    @Query() q: Record<string, unknown>,
  ) {
    return this.orders.orders(r.user, q);
  }
  @Get("orders/:id/deliveries") deliveries(
    @Req() r: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.field.orderDeliveries(r.user, id);
  }
  @Get("depots") @Roles("DISPATCHER") depots() {
    return this.orders.depots();
  }
  @Get("outlets") @Roles("DISPATCHER") outlets(
    @Query() q: Record<string, unknown>,
  ) {
    return this.orders.outlets(q);
  }
  @Get("planning/calendar") @Roles("DISPATCHER") calendar(
    @Query() q: Record<string, unknown>,
  ) {
    return this.orders.calendar(q);
  }
  @Get("vehicles") @Roles("DISPATCHER") vehicles(
    @Query() q: Record<string, unknown>,
  ) {
    return this.orders.vehicles(q);
  }
  @Get("driver/trips") @Roles("DRIVER") trips(
    @Req() r: AuthRequest,
    @Query() q: Record<string, unknown>,
  ) {
    return this.planning.listTrips(r.user, q);
  }
  @Post("evidence")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @Req() r: AuthRequest,
    @Body() b: unknown,
    @UploadedFile() f: UploadedEvidence,
  ) {
    return this.field.evidence(r.user, b, f);
  }
  @Get("evidence/:id") async evidence(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const e = await this.field.getEvidence(r.user, id);
    res.set({
      "Content-Type": e.mediaType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    return new StreamableFile(Buffer.from(e.bytes));
  }
  @Get("sync/conflicts") @Roles("DISPATCHER") conflicts(
    @Query() q: Record<string, unknown>,
  ) {
    return this.field.conflicts(q);
  }
  @Post("sync/conflicts/:id/resolve")
  @HttpCode(200)
  @Roles("DISPATCHER")
  resolve(@Req() r: AuthRequest, @Param("id") id: string, @Body() b: unknown) {
    return this.field.resolve(r.user, id, b);
  }
}
