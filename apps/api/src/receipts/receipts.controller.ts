import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { StoreAuthGuard, StoreRequest } from '../orders/store-auth.guard';
import { ReceiptsService } from './receipts.service';

@Controller('deliveries')
@UseGuards(StoreAuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(':id/receipt')
  findOne(@Req() request: StoreRequest, @Param('id') id: string) {
    return this.receiptsService.findOne(request.storeUser, id);
  }

  @Post(':id/confirm')
  confirm(@Req() request: StoreRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.receiptsService.confirm(request.storeUser, id, body);
  }
}
