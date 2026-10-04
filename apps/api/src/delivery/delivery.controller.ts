import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';

@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
  ) {}

  // GET /delivery/stop/:stopId
  @Get('stop/:stopId')
  getDeliveryByStop(
    @Param('stopId') stopId: string,
  ) {
    return this.deliveryService.getDeliveryByStop(
      stopId,
    );
  }

  // PATCH /delivery/stop/:stopId/arrive
  @Patch('stop/:stopId/arrive')
  markArrived(
    @Param('stopId') stopId: string,
  ) {
    return this.deliveryService.markArrived(
      stopId,
    );
  }

  // POST /delivery/stop/:stopId/complete
  @Post('stop/:stopId/complete')
  recordDelivery(
    @Param('stopId') stopId: string,

    @Body()
    body: {
      outcome:
        | 'DELIVERED'
        | 'PARTIAL'
        | 'FAILED';

      reason?: string;

      recipientName?: string;
      signatureRef?: string;
      photoRef?: string;

      clientActionId?: string;

      items?: {
        lineId: string;
        deliveredQty: number;
      }[];
    },
  ) {
    return this.deliveryService.recordDelivery(
      stopId,
      body,
    );
  }

  // POST /delivery/driver/:userId/issues
  @Post('driver/:userId/issues')
  reportIssue(
    @Param('userId') userId: string,

    @Body()
    body: {
      stopId?: string;
      tripId?: string;

      issueType:
        | 'BREAKDOWN'
        | 'DELAY'
        | 'ROAD'
        | 'OUTLET'
        | 'OTHER';

      message: string;
    },
  ) {
    return this.deliveryService.reportIssue(
      userId,
      body,
    );
  }

  // POST /delivery/trip/:tripId/complete
  @Post('trip/:tripId/complete')
  completeTrip(
    @Param('tripId') tripId: string,
  ) {
    return this.deliveryService.completeTrip(
      tripId,
    );
  }
}