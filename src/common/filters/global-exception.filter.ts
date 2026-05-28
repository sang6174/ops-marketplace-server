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

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = getRequestId(request);
    response.setHeader('x-request-id', requestId);

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
        case 'P2000':
          status = HttpStatus.BAD_REQUEST;
          message = 'Giá trị gửi lên vượt quá độ dài cho phép';
          errorCode = 'VALUE_TOO_LONG';
          break;
        case 'P2002': // Unique constraint
          status = HttpStatus.CONFLICT;
          message = 'Dữ liệu đã tồn tại';
          errorCode = 'UNIQUE_CONSTRAINT';
          break;
        case 'P2003': // Foreign key constraint
          status = HttpStatus.BAD_REQUEST;
          message = 'Dữ liệu tham chiếu không hợp lệ';
          errorCode = 'FOREIGN_KEY_CONSTRAINT';
          break;
        case 'P2016':
          status = HttpStatus.BAD_REQUEST;
          message = 'Truy vấn dữ liệu không hợp lệ';
          errorCode = 'QUERY_INTERPRETATION_ERROR';
          break;
        case 'P2017':
          status = HttpStatus.BAD_REQUEST;
          message = 'Quan hệ dữ liệu không hợp lệ';
          errorCode = 'RELATION_NOT_CONNECTED';
          break;
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          message = 'Không tìm thấy dữ liệu';
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
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
