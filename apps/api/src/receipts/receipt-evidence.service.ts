import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import type { RequestUser } from '../auth/request-user';

export interface ReceiptPhoto { buffer: Buffer; mimetype: string; size: number; }
@Injectable()
export class ReceiptEvidenceService {
  constructor(private readonly prisma: PrismaService, private readonly orders: OrdersService) {}
  private directory() { return resolve(process.env.UPLOAD_DIR ?? 'uploads', 'receipts'); }
  async upload(user: RequestUser, orderId: string, file?: ReceiptPhoto) {
    const order = await this.orders.findOne(user, orderId);
    if (!order.stop?.delivery || !['DELIVERED', 'PARTIAL'].includes(order.stop.delivery.outcome)) {
      throw new BadRequestException({ code: 'DELIVERY_NOT_COMPLETE', message: 'Upload a receipt photo after delivery.' });
    }
    if (order.status === 'RECEIVED') throw new BadRequestException({ code: 'RECEIPT_ALREADY_CONFIRMED', message: 'This receipt has already been confirmed.' });
    const buffer = file?.buffer;
    const extension = buffer && buffer.length >= 12 ? (
      buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' :
      buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 ? 'jpg' :
      buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null
    ) : null;
    const mimeType = extension ? { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[extension] : null;
    if (!file || !extension || file.mimetype !== mimeType) throw new BadRequestException({ code: 'INVALID_PHOTO', message: 'Upload a JPEG, PNG or WebP image using the photo field.' });
    const fileKey = `${randomUUID()}.${extension}`;
    await mkdir(this.directory(), { recursive: true });
    const path = join(this.directory(), fileKey);
    await writeFile(path, file.buffer, { flag: 'wx', mode: 0o600 });
    try {
      const saved = await this.prisma.receiptEvidence.create({ data: { orderId, uploadedById: user.id, fileKey, mimeType: mimeType!, sizeBytes: file.buffer.length } });
      return { evidenceId: saved.id, url: `/api/receipts/evidence/${saved.id}`, mimeType: saved.mimeType };
    } catch (error) { await unlink(path).catch(() => undefined); throw error; }
  }
  async download(user: RequestUser, evidenceId: string) {
    const evidence = await this.prisma.receiptEvidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) throw new NotFoundException({ code: 'EVIDENCE_NOT_FOUND', message: 'Photo not found.' });
    await this.orders.findOne(user, evidence.orderId);
    try { return { buffer: await readFile(join(this.directory(), evidence.fileKey)), mimeType: evidence.mimeType }; }
    catch { throw new NotFoundException({ code: 'EVIDENCE_FILE_MISSING', message: 'The saved photo file is unavailable.' }); }
  }
}
