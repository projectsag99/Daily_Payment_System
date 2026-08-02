import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  ParseUUIDPipe,
  Res,
  Headers,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { PaymentsService } from "./payments.service";
import {
  CreatePaymentDto,
  ListPaymentsQueryDto,
  ReversePaymentDto,
} from "./dto/payments.dto";
import {
  RequireCollectorActive,
  RequirePermissions,
  Roles,
} from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { IdempotencyKey } from "../../common/decorators/idempotency-key.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { UserRoleCode } from "../../common/constants";

@ApiTags("payments")
@ApiBearerAuth()
@Controller("payments")
@RequireCollectorActive()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @RequirePermissions("payments:create")
  @ApiOperation({ summary: "Register payment (requires Idempotency-Key)" })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePaymentDto,
    @IdempotencyKey() idempotencyKey: string | undefined,
    @Headers("x-device-id") deviceId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { body, httpStatus } = await this.paymentsService.create(
      user,
      dto,
      idempotencyKey,
      deviceId,
    );
    res.status(httpStatus);
    return body;
  }

  @Get()
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("payments:read")
  @ApiOperation({ summary: "List payments (admin)" })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListPaymentsQueryDto) {
    return this.paymentsService.listAdmin(user, query);
  }

  @Get(":id")
  @RequirePermissions("payments:read")
  @ApiOperation({ summary: "Payment detail" })
  getById(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.getById(user, id);
  }

  @Post(":id/reverse")
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("payments:read")
  @ApiOperation({ summary: "Reverse payment (admin)" })
  reverse(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReversePaymentDto,
    @Req() req: Request,
  ) {
    return this.paymentsService.reverse(user, id, dto, req.ip);
  }
}
