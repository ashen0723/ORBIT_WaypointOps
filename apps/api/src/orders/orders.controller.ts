import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { StoreAuthGuard, StoreRequest } from './store-auth.guard';
import { catalog } from './catalog';
import { PrismaService } from '../prisma/prisma.service';

@Controller('orders')
@UseGuards(StoreAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() request: StoreRequest, @Body() body: unknown) {
    return this.ordersService.create(request.storeUser, body);
  }

  @Get(':id')
  findOne(@Req() request: StoreRequest, @Param('id') id: string) {
    return this.ordersService.findOne(request.storeUser, id);
  }
}

@Controller('store/orders')
@UseGuards(StoreAuthGuard)
export class StoreOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@Req() request: StoreRequest) {
    return this.ordersService.list(request.storeUser);
  }
}

@Controller('catalog')
@UseGuards(StoreAuthGuard)
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() request: StoreRequest) {
    const outlet = await this.prisma.outlet.findUniqueOrThrow({ where: { id: request.storeUser.outletId } });
    return catalog.filter(item => item.brand === outlet.brand);
  }
}
