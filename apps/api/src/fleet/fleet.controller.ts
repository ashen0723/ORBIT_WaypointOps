import { Controller, Get, Param, Query } from '@nestjs/common';
import { FleetService } from './fleet.service';

@Controller('vehicles')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.fleetService.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.fleetService.get(id, query);
  }
}
