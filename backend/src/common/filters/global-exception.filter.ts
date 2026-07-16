import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

interface DatabaseDriverError {
  code?: string;
  detail?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (this.isHttpExceptionResponse(exceptionResponse)) {
        message = exceptionResponse.message ?? exception.message;
        error = exceptionResponse.error ?? exception.name;
      }
    } else if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as DatabaseDriverError;

      if (driverError.code === '23505') {
        status = HttpStatus.CONFLICT;
        message = 'A record with this value already exists';
        error = 'Conflict';
      } else if (driverError.code === '23503') {
        status = HttpStatus.BAD_REQUEST;
        message = 'The referenced record does not exist';
        error = 'Bad Request';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    });
  }

  private isHttpExceptionResponse(
    value: object,
  ): value is HttpExceptionResponse {
    return 'message' in value || 'error' in value || 'statusCode' in value;
  }
}
