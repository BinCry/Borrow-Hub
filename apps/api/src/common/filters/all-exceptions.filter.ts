import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || (res as any).error || res;
        code = (res as any).code || exception.name;
      } else {
        message = res;
        code = exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`Unhandled Exception of unknown type`, String(exception));
    }

    const requestId = request.headers['x-request-id'] || 'unknown';

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}
