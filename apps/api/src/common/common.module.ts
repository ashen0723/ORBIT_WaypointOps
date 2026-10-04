import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApiExceptionFilter } from './api-exception.filter';
@Global()
@Module({ providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }] })
export class CommonModule {}
