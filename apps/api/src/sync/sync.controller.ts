import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  // POST /sync/actions
  @Post('actions')
  processActions(
    @Body()
    body: {
      actions: {
        clientActionId: string;
        userId: string;
        actionType: 'ARRIVE' | 'DELIVERY_OUTCOME';
        entityId: string;
        payload?: Record<string, unknown>;
      }[];
    },
  ) {
    return this.syncService.processActions(body.actions);
  }

  // GET /sync/actions/:clientActionId
  @Get('actions/:clientActionId')
  getAction(
    @Param('clientActionId') clientActionId: string,
  ) {
    return this.syncService.getAction(clientActionId);
  }
}