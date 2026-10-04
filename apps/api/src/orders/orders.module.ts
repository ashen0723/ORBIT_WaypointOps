import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrdersController, StoreOrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { StoreAuthGuard } from './store-auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [OrdersController, StoreOrdersController],
  providers: [OrdersService, StoreAuthGuard],
  exports: [OrdersService, StoreAuthGuard, JwtModule],
})
export class OrdersModule {}
