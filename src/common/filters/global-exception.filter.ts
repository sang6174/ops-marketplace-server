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

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Đã có lỗi xảy ra, vui lòng thử lại';
    let errorCode: string | undefined;

    // ===== HttpException =====
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;

        message = (resObj['message'] as string | string[]) ?? exception.message;
        errorCode = resObj['errorCode'] as string | undefined;
      }
    }

    // ===== Prisma errors =====
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': // Unique constraint
          status = HttpStatus.CONFLICT;
          message = 'Existing data violates unique constraint';
          errorCode = 'UNIQUE_CONSTRAINT';
          break;
        case 'P2003': // Foreign key constraint
          status = HttpStatus.BAD_REQUEST;
          message = 'Existing data violates foreign key constraint';
          errorCode = 'FOREIGN_KEY_CONSTRAINT';
          break;
        case 'P2016':
          status = HttpStatus.BAD_REQUEST;
          message =
            "The provided value for the column is too long for the column's type.";
          errorCode = 'VALUE_TOO_LONG';
          break;
        case 'P2017':
          status = HttpStatus.BAD_REQUEST;
          message =
            "The provided value for the column is too short for the column's type.";
          errorCode = 'VALUE_TOO_SHORT';
          break;
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          errorCode = 'NOT_FOUND';
          break;
        default:
          this.logger.error(
            `Prisma error ${exception.code}:`,
            exception.message,
          );
      }
    }

    // ===== Unknown errors =====
    else {
      this.logger.error('Unexpected error:', exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errorCode && { errorCode }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
