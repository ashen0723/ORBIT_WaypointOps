import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { FleetService } from './fleet.service';

@Controller()
@UseGuards(AuthGuard)
@Roles('DISPATCHER')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('fleet/vehicles')
  list(@Query() query: Record<string, unknown>) {
    return this.fleetService.list(query);
  }

  @Get('vehicles/:id')
  get(@Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.fleetService.get(id, query);
  }
}
