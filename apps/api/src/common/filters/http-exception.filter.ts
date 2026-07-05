import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Unhandled exceptions (Prisma errors, connection failures, ...) may carry
    // internal details; log them server-side and return a generic message.
    if (!isHttpException) {
      this.logger.error(
        `Unhandled exception on ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const detail = isHttpException
      ? extractDetail(exception.getResponse())
      : 'An unexpected error occurred';

    res.status(status).json({
      status,
      title: statusTitle(status),
      detail: Array.isArray(detail) ? detail.join('; ') : detail,
      instance: req.url,
    });
  }
}

function extractDetail(exceptionResponse: string | object): string | string[] {
  if (typeof exceptionResponse === 'object') {
    const msg = (exceptionResponse as Record<string, unknown>).message;
    if (msg !== undefined) return msg as string | string[];
  }
  return String(exceptionResponse);
}

function statusTitle(status: number): string {
  const titles: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
  };
  return titles[status] ?? 'Error';
}
