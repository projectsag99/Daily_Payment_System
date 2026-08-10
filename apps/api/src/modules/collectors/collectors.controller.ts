import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Request } from "express";
import { CollectorsService } from "./collectors.service";
import {
  ApproveCollectorDto,
  DeactivateCollectorDto,
  ListCollectorsQueryDto,
  RejectCollectorDto,
  SuspendCollectorDto,
} from "./dto/collectors.dto";
import { Roles, RequirePermissions } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRoleCode } from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("collectors")
@ApiBearerAuth()
@Controller("collectors")
@Roles(UserRoleCode.ADMIN)
export class CollectorsController {
  constructor(private readonly collectorsService: CollectorsService) {}

  @Get()
  @RequirePermissions("collectors:read")
  @ApiOperation({ summary: "List collectors" })
  list(@Query() query: ListCollectorsQueryDto) {
    return this.collectorsService.list(query.status, query.assignable);
  }

  @Get(":id")
  @RequirePermissions("collectors:read")
  @ApiOperation({ summary: "Collector detail" })
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.collectorsService.getById(id);
  }

  @Post(":id/approve")
  @RequirePermissions("collectors:approve")
  @ApiOperation({ summary: "Approve collector (pending → active)" })
  approve(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: ApproveCollectorDto,
    @Req() req: Request,
  ) {
    return this.collectorsService.approve(id, admin.sub, dto, req.ip);
  }

  @Post(":id/reject")
  @RequirePermissions("collectors:approve")
  @ApiOperation({ summary: "Reject collector (pending → rejected)" })
  reject(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: RejectCollectorDto,
    @Req() req: Request,
  ) {
    return this.collectorsService.reject(id, admin.sub, dto, req.ip);
  }

  @Post(":id/suspend")
  @RequirePermissions("collectors:manage")
  @ApiOperation({ summary: "Suspend collector (active → suspended)" })
  suspend(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: SuspendCollectorDto,
    @Req() req: Request,
  ) {
    return this.collectorsService.suspend(id, admin.sub, dto, req.ip);
  }

  @Post(":id/reactivate")
  @RequirePermissions("collectors:manage")
  @ApiOperation({ summary: "Reactivate collector (suspended → active)" })
  reactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: JwtPayload,
    @Req() req: Request,
  ) {
    return this.collectorsService.reactivate(id, admin.sub, req.ip);
  }

  @Post(":id/deactivate")
  @RequirePermissions("collectors:manage")
  @ApiOperation({ summary: "Deactivate collector (active → deactivated)" })
  deactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: DeactivateCollectorDto,
    @Req() req: Request,
  ) {
    return this.collectorsService.deactivate(id, admin.sub, dto, req.ip);
  }
}
