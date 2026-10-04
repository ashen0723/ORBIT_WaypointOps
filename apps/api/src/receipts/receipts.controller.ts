import { Body, Controller, Get, Param, Post, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, StoreManagerGuard } from '../auth/auth.guard';
import { CurrentUser, RequestUser } from '../auth/request-user';
import { ReceiptEvidenceService, ReceiptPhoto } from './receipt-evidence.service';
import { ReceiptsService } from './receipts.service';

@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService, private readonly evidence: ReceiptEvidenceService) {}
  @Post() @UseGuards(StoreManagerGuard)
  confirm(@CurrentUser() user: RequestUser, @Body() body: unknown) { return this.receipts.confirm(user, body); }
  @Get('orders/:orderId')
  get(@CurrentUser() user: RequestUser, @Param('orderId') id: string) { return this.receipts.get(user, id); }
  @Post('orders/:orderId/evidence') @UseGuards(StoreManagerGuard)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 } }))
  upload(@CurrentUser() user: RequestUser, @Param('orderId') id: string, @UploadedFile() file?: ReceiptPhoto) { return this.evidence.upload(user, id, file); }
  @Get('evidence/:id')
  async download(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const file = await this.evidence.download(user, id);
    return new StreamableFile(file.buffer, { type: file.mimeType, disposition: 'inline' });
  }
}
