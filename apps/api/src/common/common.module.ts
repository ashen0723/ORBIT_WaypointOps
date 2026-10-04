import { Global, Module } from '@nestjs/common';

/** Shared cross-cutting pieces: exception filters (standard error shape), guards, pipes. */
@Global()
@Module({})
export class CommonModule {}
