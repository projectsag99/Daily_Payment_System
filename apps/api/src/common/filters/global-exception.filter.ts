import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ApiErrorCode } from "../constants";

interface ErrorBody {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
  details: unknown[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const requestId = request.requestId ?? "unknown";
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let code = ApiErrorCode.VALIDATION_ERROR;
      let message = exception.message;
      let details: unknown[] = [];

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        if (typeof body.code === "string") {
          code = body.code as ApiErrorCode;
        }
        if (typeof body.message === "string") {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = "Error de validación";
          details = body.message;
        }
      }

      const errorBody: ErrorBody = {
        statusCode: status,
        error: HttpStatus[status] ?? "Error",
        code,
        message,
        requestId,
        timestamp,
        details,
      };

      response.status(status).json(errorBody);
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      error: "Internal Server Error",
      code: "INTERNAL_ERROR",
      message: "Ocurrió un error interno. Intenta de nuevo más tarde.",
      requestId,
      timestamp,
      details: [],
    } satisfies ErrorBody);
  }
}
