import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@infrastructure/generated/prisma/client';
import {
  BaseException,
  ClientException,
  ValidationException,
  DatabaseException,
  ServerException,
} from '@shared/exceptions';
import {
  ErrorProductionResponse,
  ErrorDevelopmentResponse,
} from '@shared/dto/error-response.dto';
import { ConfigService } from '@nestjs/config';
import { getRequestId } from '@common/utils';
import { LoggerService } from '@common/services/logger.service';

@Catch()
@Injectable()
export class BaseExceptionFilter implements ExceptionFilter {
  private readonly isDevelopment: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.isDevelopment = configService.get('NODE_ENV') !== 'production';
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request.url;
    const requestId = getRequestId(request);

    response.setHeader('x-request-id', requestId);

    let errorResponse: ErrorProductionResponse | ErrorDevelopmentResponse;
    let shouldLog = true;

    if (exception instanceof BaseException) {
      errorResponse = this.isDevelopment
        ? exception.toErrorDevelopmentResponse(path)
        : exception.toErrorProductionResponse(path);
      errorResponse.requestId = requestId;
      shouldLog = exception.shouldLog();

      if (shouldLog) {
        this.logException(exception, path);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { status, code, message } = this.handlePrismaError(exception);
      errorResponse = this.isDevelopment
        ? new ErrorDevelopmentResponse(
            status,
            code,
            path,
            message,
            new Date().toISOString(),
            { prismaCode: exception.code, meta: exception.meta },
            exception,
          )
        : new ErrorProductionResponse(
            status,
            code,
            path,
            message,
            new Date().toISOString(),
          );
      errorResponse.requestId = requestId;

      if (status >= 500) {
        this.logger.logException(code, `Prisma error ${exception.code}: ${exception.message}`, 'HIGH', {
          requestId,
          path,
          prismaCode: exception.code,
          stack: exception.stack,
        });
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      errorResponse = this.isDevelopment
        ? new ErrorDevelopmentResponse(
            HttpStatus.BAD_REQUEST,
            'PRISMA_VALIDATION_ERROR',
            path,
            'Invalid query data',
            new Date().toISOString(),
            { validationError: exception.message },
            exception,
          )
        : new ErrorProductionResponse(
            HttpStatus.BAD_REQUEST,
            'PRISMA_VALIDATION_ERROR',
            path,
            'Invalid request data',
            new Date().toISOString(),
          );
      errorResponse.requestId = requestId;

      this.logger.logException(
        'PRISMA_VALIDATION_ERROR',
        `Prisma validation error: ${exception.message}`,
        'MEDIUM',
        { requestId, path, stack: exception.stack },
      );
    } else if (exception instanceof BadRequestException) {
      const responseObj = exception.getResponse();
      if (
        typeof responseObj === 'object' &&
        responseObj !== null &&
        'message' in responseObj &&
        Array.isArray((responseObj as { message?: unknown }).message)
      ) {
        const errors = this.extractValidationErrors(responseObj);
        const clientEx = new ValidationException(errors);
        errorResponse = this.isDevelopment
          ? clientEx.toErrorDevelopmentResponse(path)
          : clientEx.toErrorProductionResponse(path);
        errorResponse.requestId = requestId;
      } else {
        errorResponse = this.isDevelopment
          ? new ErrorDevelopmentResponse(
              HttpStatus.BAD_REQUEST,
              'BAD_REQUEST',
              path,
              exception.message || 'Bad request',
              new Date().toISOString(),
            )
          : new ErrorProductionResponse(
              HttpStatus.BAD_REQUEST,
              'BAD_REQUEST',
              path,
              'Invalid request data',
              new Date().toISOString(),
            );
        errorResponse.requestId = requestId;
      }
    } else if (exception instanceof UnauthorizedException) {
      const clientEx = new ClientException(
        exception.message || 'Unauthorized',
        'UNAUTHORIZED',
        401,
      );
      errorResponse = this.isDevelopment
        ? clientEx.toErrorDevelopmentResponse(path)
        : clientEx.toErrorProductionResponse(path);
      errorResponse.requestId = requestId;
    } else if (exception instanceof ForbiddenException) {
      const clientEx = new ClientException(
        exception.message || 'Forbidden',
        'FORBIDDEN',
        403,
      );
      errorResponse = this.isDevelopment
        ? clientEx.toErrorDevelopmentResponse(path)
        : clientEx.toErrorProductionResponse(path);
      errorResponse.requestId = requestId;
    } else if (exception instanceof NotFoundException) {
      const clientEx = new ClientException(
        exception.message || 'Not found',
        'NOT_FOUND',
        404,
      );
      errorResponse = this.isDevelopment
        ? clientEx.toErrorDevelopmentResponse(path)
        : clientEx.toErrorProductionResponse(path);
      errorResponse.requestId = requestId;
    } else if (exception instanceof ConflictException) {
      const clientEx = new ClientException(
        exception.message || 'Conflict',
        'CONFLICT',
        409,
      );
      errorResponse = this.isDevelopment
        ? clientEx.toErrorDevelopmentResponse(path)
        : clientEx.toErrorProductionResponse(path);
      errorResponse.requestId = requestId;
    } else {
      const serverEx = new ServerException(
        'Internal server error',
        'INTERNAL_SERVER_ERROR',
        { originalError: exception.message },
        exception,
      );
      errorResponse = this.isDevelopment
        ? serverEx.toErrorDevelopmentResponse(path)
        : serverEx.toErrorProductionResponse(path);
      errorResponse.requestId = requestId;
      shouldLog = true;

      this.logger.logException(
        'UNHANDLED_EXCEPTION',
        `[UNHANDLED] ${exception.message}`,
        'CRITICAL',
        {
          requestId,
          path,
          type: exception?.constructor?.name,
          stack: exception.stack,
        },
      );
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): { status: number; code: string; message: string } {
    switch (exception.code) {
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'VALUE_TOO_LONG',
          message: 'Value exceeds maximum allowed length',
        };
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: 'UNIQUE_CONSTRAINT',
          message: 'Duplicate data already exists',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'FOREIGN_KEY_CONSTRAINT',
          message: 'Invalid reference data',
        };
      case 'P2016':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'QUERY_INTERPRETATION_ERROR',
          message: 'Invalid query interpretation',
        };
      case 'P2017':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'RELATION_NOT_CONNECTED',
          message: 'Invalid data relation',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'Record not found',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: `PRISMA_${exception.code}`,
          message: 'Database error occurred. Please try again later.',
        };
    }
  }

  private logException(exception: BaseException, path: string): void {
    const { severity, code, message, context, cause } = exception;

    this.logger.logException(code, message, severity, {
      path,
      context,
      causeMessage: cause?.message,
      stack: cause?.stack || exception.stack,
    });
  }

  private extractValidationErrors(responseObj: any): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    if (Array.isArray(responseObj.message)) {
      responseObj.message.forEach((msg: string) => {
        const match = msg.match(/^(\w+)\s+(.+)$/);
        if (match) {
          const [, field, error] = match;
          if (!errors[field]) errors[field] = [];
          errors[field].push(error);
        } else {
          if (!errors['unknown']) errors['unknown'] = [];
          errors['unknown'].push(msg);
        }
      });
    }
    return errors;
  }
}
