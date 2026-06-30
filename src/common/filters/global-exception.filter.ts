import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@infrastructure/generated/prisma/client';
import { getRequestId } from '@common/utils';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isDev = process.env.NODE_ENV === 'development';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = getRequestId(request);
    response.setHeader('x-request-id', requestId);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] =
      'An internal server error occurred. Please try again later.';
    let errorCode: string | undefined;
    let details: unknown = undefined;
    let stack: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj['message'] as string | string[]) ?? exception.message;
        errorCode = resObj['errorCode'] as string | undefined;
        if (this.isDev && resObj['details'] !== undefined) {
          details = resObj['details'];
        }
      }

      if (this.isDev && exception instanceof Error) {
        stack = exception.stack;
      }
    }

    // ===== Prisma Known Errors =====
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2000':
          status = HttpStatus.BAD_REQUEST;
          message = 'Value exceeds maximum allowed length';
          errorCode = 'VALUE_TOO_LONG';
          break;
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Duplicate data already exists';
          errorCode = 'UNIQUE_CONSTRAINT';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid reference data';
          errorCode = 'FOREIGN_KEY_CONSTRAINT';
          break;
        case 'P2016':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid query interpretation';
          errorCode = 'QUERY_INTERPRETATION_ERROR';
          break;
        case 'P2017':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid data relation';
          errorCode = 'RELATION_NOT_CONNECTED';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          errorCode = 'NOT_FOUND';
          break;
        default:
          this.logger.error(
            `Prisma error ${exception.code}: ${exception.message}`,
            exception.stack,
          );
          if (this.isDev) {
            details = { prismaCode: exception.code, meta: exception.meta };
            stack = exception.stack;
          }
      }
    }

    // ===== Prisma Validation Error (syntax error) =====
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid query data';
      errorCode = 'PRISMA_VALIDATION_ERROR';
      if (this.isDev) {
        details = { validationError: exception.message };
        stack = exception.stack;
      }
      this.logger.warn(`Prisma validation error: ${exception.message}`);
    }

    // ===== Unknown errors =====
    else {
      this.logger.error('Unexpected error:', exception);
      // Trong dev, trả về chi tiết lỗi để debug
      if (this.isDev && exception instanceof Error) {
        message = exception.message;
        stack = exception.stack;
      }
    }

    // ===== Build response body =====
    const responseBody: Record<string, unknown> = {
      success: false,
      statusCode: status,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (errorCode) responseBody.errorCode = errorCode;
    if (this.isDev) {
      if (details !== undefined) responseBody.details = details;
      if (stack) responseBody.stack = stack;
    }

    response.status(status).json(responseBody);
  }
}
