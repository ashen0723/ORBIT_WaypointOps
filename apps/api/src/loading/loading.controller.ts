import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Roles, type AuthRequest } from "../auth/auth.guard";
import { DecisionsService } from "../planning/decisions.service";
@Controller()
@UseGuards(AuthGuard)
export class LoadingController {
  constructor(private readonly decisions: DecisionsService) {}
  @Get("trips/:id/loading")
  @Roles("LOADER", "DISPATCHER")
  loading(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.decisions.getLoading(req.user, id);
  }
  @Post("loading/:id/start")
  @HttpCode(200)
  @Roles("LOADER")
  start(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.decisions.startLoading(req.user, id, body);
  }
  @Patch("loading/:id/lines/:lineId")
  @Roles("LOADER")
  line(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Param("lineId") lineId: string,
    @Body() body: unknown,
  ) {
    return this.decisions.loadLine(req.user, id, lineId, body);
  }
  @Post("loading/:id/issues")
  @Roles("LOADER")
  report(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.decisions.reportIssue(req.user, id, body);
  }
  @Post("loading/issues/:id/acknowledge")
  @HttpCode(200)
  @Roles("LOADER")
  acknowledge(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.decisions.acknowledgeIssue(req.user, id, body);
  }
}
