import { Injectable } from "@nestjs/common";
import type { Actor } from "../auth/auth.service";
import { fail } from "../common/api-error";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class SyncService {
  constructor(private readonly db: PrismaService) {}
  async getAction(actor: Actor, clientActionId: string) {
    const record = await this.db.mutationRecord.findUnique({
      where: { actorId_clientActionId: { actorId: actor.id, clientActionId } },
      select: { clientActionId: true, response: true, createdAt: true },
    });
    if (!record) fail(404, "NOT_FOUND", "No recorded action for this account.");
    return {
      clientActionId: record.clientActionId,
      recordedAt: record.createdAt.toISOString(),
      result: record.response,
    };
  }
}
