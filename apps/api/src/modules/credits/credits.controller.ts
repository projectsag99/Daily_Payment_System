import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Request } from "express";
import { CreditsService } from "./credits.service";
import { CreateCreditDto, RegenerateInstallmentsDto } from "./dto/credits.dto";
import {
  RequireCollectorActive,
  RequirePermissions,
  Roles,
} from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { UserRoleCode } from "../../common/constants";

@ApiTags("credits")
@ApiBearerAuth()
@Controller()
@RequireCollectorActive()
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Post("clients/:clientId/credits")
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("credits:write")
  @ApiOperation({ summary: "Create credit and installment schedule" })
  createForClient(
    @CurrentUser() user: JwtPayload,
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: CreateCreditDto,
    @Req() req: Request,
  ) {
    return this.creditsService.createForClient(user, clientId, dto, req.ip);
  }

  @Get("credits/:id")
  @RequirePermissions("credits:read")
  @ApiOperation({ summary: "Credit detail" })
  getById(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.creditsService.getById(user, id);
  }

  @Get("credits/:id/installments")
  @RequirePermissions("credits:read")
  @ApiOperation({ summary: "Installment list for credit" })
  listInstallments(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.creditsService.listInstallments(user, id);
  }

  @Post("credits/:id/installments/regenerate")
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("credits:write")
  @ApiOperation({ summary: "Regenerate installment schedule (admin)" })
  regenerateInstallments(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RegenerateInstallmentsDto,
    @Req() req: Request,
  ) {
    return this.creditsService.regenerateInstallments(user, id, dto, req.ip);
  }
}
