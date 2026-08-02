import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Request } from "express";
import { RulesService } from "./rules.service";
import { CreateRuleDto, EvaluateRuleDto, UpdateRuleDto } from "./dto/rules.dto";
import { Roles, RequirePermissions } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRoleCode } from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("rules")
@ApiBearerAuth()
@Controller("rules")
@Roles(UserRoleCode.ADMIN)
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  @RequirePermissions("rules:manage")
  @ApiOperation({ summary: "List business rules" })
  list() {
    return this.rulesService.list();
  }

  @Post()
  @RequirePermissions("rules:manage")
  @ApiOperation({ summary: "Create business rule" })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRuleDto,
    @Req() req: Request,
  ) {
    return this.rulesService.create(user, dto, req.ip);
  }

  @Patch(":id")
  @RequirePermissions("rules:manage")
  @ApiOperation({ summary: "Update business rule" })
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRuleDto,
    @Req() req: Request,
  ) {
    return this.rulesService.update(user, id, dto, req.ip);
  }

  @Delete(":id")
  @RequirePermissions("rules:manage")
  @ApiOperation({ summary: "Soft delete business rule" })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.rulesService.softDelete(user, id, req.ip);
  }

  @Post(":id/evaluate")
  @RequirePermissions("rules:manage")
  @ApiOperation({ summary: "Manually evaluate rule" })
  evaluate(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EvaluateRuleDto,
    @Req() req: Request,
  ) {
    return this.rulesService.evaluate(user, id, dto, req.ip);
  }
}
