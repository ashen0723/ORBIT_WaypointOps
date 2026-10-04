import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles, type AuthRequest } from '../auth/auth.guard';
import { DecisionsService } from './decisions.service';
@Controller() @UseGuards(AuthGuard)
export class DecisionsController {
  constructor(private readonly decisions: DecisionsService) {}
  @Post('loading/issues/:id/decision') @HttpCode(200) @Roles('DISPATCHER')
  decision(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.decisions.decideShortfall(req.user, id, body); }
  @Get('deliveries/:id/recovery') @Roles('DISPATCHER')
  recoveryState(@Param('id') id:string){return this.decisions.recoveryState(id);}
  @Post('deliveries/:id/recovery') @Roles('DISPATCHER')
  recovery(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.decisions.recover(req.user, id, body); }
  @Post('planning/defer') @HttpCode(200) @Roles('DISPATCHER')
  defer(@Req() req: AuthRequest, @Body() body: unknown) { return this.decisions.defer(req.user, body); }
  @Get('orders/:id/deferrals') @Roles('DISPATCHER', 'STORE_MANAGER')
  history(@Req() req: AuthRequest, @Param('id') id: string, @Query() query: Record<string, unknown>) { return this.decisions.deferrals(req.user, id, query); }
  @Post('stops/:id/reschedule') @HttpCode(200) @Roles('DISPATCHER')
  reschedule(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.decisions.reschedule(req.user, id, body); }
  @Post('stops/:id/acknowledge-reschedule') @HttpCode(200) @Roles('DRIVER')
  returned(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.decisions.acknowledgeReschedule(req.user, id, body); }
}
