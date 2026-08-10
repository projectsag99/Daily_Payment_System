import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import { Request } from "express";

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { requestId?: string }>();
    const incoming = request.headers["x-request-id"];
    request.requestId =
      typeof incoming === "string" && incoming.length > 0 ? incoming : uuidv4();
    return next.handle();
  }
}
