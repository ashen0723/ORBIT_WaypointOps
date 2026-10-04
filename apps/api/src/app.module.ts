import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OutletsModule } from './outlets/outlets.module';
import { OrdersModule } from './orders/orders.module';
import { FleetModule } from './fleet/fleet.module';
import { PlanningModule } from './planning/planning.module';
import { TripsModule } from './trips/trips.module';
import { LoadingModule } from './loading/loading.module';
import { DeliveryModule } from './delivery/delivery.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OutletsModule,
    OrdersModule,
    FleetModule,
    PlanningModule,
    TripsModule,
    LoadingModule,
    DeliveryModule,
    ReceiptsModule,
    SyncModule,
  ],
})
export class AppModule {}
