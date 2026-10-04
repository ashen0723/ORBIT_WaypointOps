import { Controller, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles, type AuthRequest } from "../auth/auth.guard";
import { TripsService } from "./trips.service";
@Controller("trips")
@UseGuards(AuthGuard)
export class TripsController {
  constructor(private readonly trips: TripsService) {}
  @Get("driver/:userId/today")
  @Roles("DRIVER")
  today(
    @Req() r: AuthRequest,
    @Param("userId") id: string,
    @Query() q: Record<string, unknown>,
  ) {
    return this.trips.today(r.user, id, q);
  }
  @Get("order/:orderId/delivery")
  @Roles("STORE_MANAGER", "DISPATCHER", "DRIVER")
  delivery(@Req() r: AuthRequest, @Param("orderId") id: string) {
    return this.trips.orderDelivery(r.user, id);
  }
  @Get(":tripId/delivery-progress")
  @Roles("DISPATCHER")
  progress(@Req() r: AuthRequest, @Param("tripId") id: string) {
    return this.trips.progress(r.user, id);
  }
}
