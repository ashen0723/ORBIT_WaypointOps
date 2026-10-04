import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const body = typeof raw === 'string' ? { message: raw } : raw as Record<string, unknown>;
      response.status(status).json({ ...body, code: body.code ?? `HTTP_${status}`, message: body.message ?? exception.message, details: body.details ?? null });
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : 'Unknown API failure');
      response.status(500).json({ code: 'INTERNAL_ERROR', message: 'The request could not be completed. Try again.', details: null });
    }
  }
}
