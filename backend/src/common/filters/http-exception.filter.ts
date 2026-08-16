import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

/**
 * T037: every route in this app already throws HttpExceptions with an
 * `{ error, message }` body (contracts/api.md's error shape) — this filter
 * only needs to (a) catch anything that ISN'T one of those, so a bug never
 * leaks a stack trace to a client, and (b) log server-side either way.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const shaped = typeof body === 'object' && body !== null ? body : { error: 'ERROR', message: String(body) };
      if (status >= 500) this.logger.error(exception.message, exception.stack);
      response.status(status).json({ statusCode: status, ...shaped });
      return;
    }

    const err = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(err.message, err.stack);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: 'INTERNAL_ERROR', message: 'Something went wrong' });
  }
}
