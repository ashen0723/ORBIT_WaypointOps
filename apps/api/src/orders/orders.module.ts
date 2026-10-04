import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderPolicyService } from './order-policy.service';
@Module({ controllers: [OrdersController], providers: [OrdersService, OrderPolicyService], exports: [OrdersService, OrderPolicyService] })
export class OrdersModule {}
