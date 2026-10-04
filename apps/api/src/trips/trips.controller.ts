import { Controller, Get, Param } from '@nestjs/common';
import { TripsService } from './trips.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // Driver Today page
  // GET /trips/driver/:userId/today
  @Get('driver/:userId/today')
  getDriverToday(@Param('userId') userId: string) {
    return this.tripsService.getDriverToday(userId);
  }

  // Store delivery projection
  // GET /trips/order/:orderId/delivery
  @Get('order/:orderId/delivery')
  getOrderDelivery(@Param('orderId') orderId: string) {
    return this.tripsService.getOrderDelivery(orderId);
  }

  // Dispatcher delivery progress
  // GET /trips/:tripId/delivery-progress
  @Get(':tripId/delivery-progress')
  getDeliveryProgress(@Param('tripId') tripId: string) {
    return this.tripsService.getDeliveryProgress(tripId);
  }

  // Get one trip with all stops
  // GET /trips/:tripId
  @Get(':tripId')
  getTripById(@Param('tripId') tripId: string) {
    return this.tripsService.getTripById(tripId);
  }
}