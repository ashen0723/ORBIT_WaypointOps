import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { ReceiptEvidenceService } from './receipt-evidence.service';
@Module({ imports: [OrdersModule], controllers: [ReceiptsController], providers: [ReceiptsService, ReceiptEvidenceService], exports: [ReceiptsService] })
export class ReceiptsModule {}
