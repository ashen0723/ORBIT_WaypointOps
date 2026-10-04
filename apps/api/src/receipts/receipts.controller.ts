import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { StoreAuthGuard, StoreRequest } from '../orders/store-auth.guard';
import { ReceiptsService } from './receipts.service';

@Controller('deliveries')
@UseGuards(StoreAuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post(':id/issues')
  reportIssues(@Req() request: StoreRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.receiptsService.reportIssues(request.storeUser, id, body);
  }

  @Post(':id/confirm')
  confirm(@Req() request: StoreRequest, @Param('id') id: string) {
    return this.receiptsService.confirm(request.storeUser, id);
  }
}
