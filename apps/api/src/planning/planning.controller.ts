import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles, type AuthRequest } from '../auth/auth.guard';
import { PlanningService } from './planning.service';

@Controller('planning') @UseGuards(AuthGuard) @Roles('DISPATCHER')
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}
  @Post('drafts') save(@Req() req: AuthRequest, @Body() body: unknown) { return this.planning.saveDraft(req.user, body); }
  @Get('drafts') listDrafts(@Req() req: AuthRequest,@Query() query:Record<string,unknown>) {return this.planning.listDrafts(req.user,query);}
  @Get('drafts/:id') get(@Param('id') id: string) { return this.planning.getDraft(id); }
  @Patch('drafts/:id') update(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.planning.updateDraft(req.user, id, body); }
  @Post('validate') @HttpCode(200) validate(@Body() body: unknown) { return this.planning.validate(body); }
  @Post('allocate') allocate(@Req() req: AuthRequest, @Body() body: unknown) { return this.planning.allocate(req.user, body); }
}

@Controller() @UseGuards(AuthGuard)
export class PlanningTripsController {
  constructor(private readonly planning: PlanningService) {}
  @Post('plans/publish') @HttpCode(200) @Roles('DISPATCHER')
  publish(@Req() req: AuthRequest, @Body() body: unknown) { return this.planning.publish(req.user, body); }
  @Post('trips/:id/vehicle-unavailable') @HttpCode(200) @Roles('LOADER', 'DISPATCHER')
  unavailable(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.planning.reportVehicleUnavailable(req.user, id, body); }
  @Patch('trips/:id/plan') @Roles('DISPATCHER')
  amend(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.planning.amend(req.user, id, body); }
  @Post('trips/:id/release') @HttpCode(200) @Roles('DISPATCHER')
  release(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.planning.release(req.user, id, body); }
  @Get('trips') @Roles('DISPATCHER', 'LOADER', 'DRIVER')
  list(@Req() req: AuthRequest, @Query() query: Record<string, unknown>) { return this.planning.listTrips(req.user, query); }
  @Get('trips/:id') @Roles('DISPATCHER', 'LOADER', 'DRIVER')
  trip(@Req() req: AuthRequest, @Param('id') id: string) { return this.planning.getTrip(req.user, id); }
  @Get('loader/trips') @Roles('LOADER')
  loaderTrips(@Req() req: AuthRequest, @Query() query: Record<string, unknown>) { return this.planning.listTrips(req.user, query); }
  @Post('trips/:id/acknowledge-plan') @HttpCode(200) @Roles('LOADER')
  acknowledge(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.planning.acknowledge(req.user, id, body); }
  @Post('trips/:id/ready') @HttpCode(200) @Roles('LOADER')
  ready(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.planning.ready(req.user, id, body); }

}
