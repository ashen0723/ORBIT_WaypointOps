import { Injectable } from '@nestjs/common';

/** Offline action queue: idempotent POST /sync/actions and conflicts. */
@Injectable()
export class SyncService {}
