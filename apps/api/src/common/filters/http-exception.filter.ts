import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const detail = extractDetail(exceptionResponse, exception);

    res.status(status).json({
      status,
      title: statusTitle(status),
      detail: Array.isArray(detail) ? detail.join('; ') : detail,
      instance: req.url,
    });
  }
}

function extractDetail(
  exceptionResponse: string | object | null,
  exception: unknown,
): string | string[] {
  if (exceptionResponse === null) {
    return exception instanceof Error ? exception.message : 'An error occurred';
  }
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
