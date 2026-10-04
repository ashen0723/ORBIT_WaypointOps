import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Actor } from "../auth/auth.service";
@Injectable()
export class OutletsService {
  constructor(private readonly prisma: PrismaService) {}
  async me(user: Actor) {
    if (user.role !== "STORE_MANAGER" || !user.outletId)
      throw new ForbiddenException({
        code: "STORE_ACCESS_REQUIRED",
        message: "Your account needs an assigned outlet.",
      });
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: user.outletId },
      include: { depot: true },
    });
    if (!outlet)
      throw new NotFoundException({
        code: "OUTLET_NOT_FOUND",
        message: "Your outlet was not found.",
      });
    return outlet;
  }
}
