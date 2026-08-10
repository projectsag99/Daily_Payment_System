import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Request } from "express";
import { RoutesService } from "./routes.service";
import {
  AssignCollectorDto,
  CreateRouteDto,
  ListRoutesQueryDto,
  MyRoutesQueryDto,
  ReplaceRouteClientsDto,
  RouteClientsQueryDto,
  UpdateRouteDto,
} from "./dto/routes.dto";
import {
  RequireCollectorActive,
  RequirePermissions,
  Roles,
} from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { UserRoleCode } from "../../common/constants";

@ApiTags("routes")
@ApiBearerAuth()
@Controller("routes")
@RequireCollectorActive()
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get("my")
  @RequirePermissions("routes:read")
  @ApiOperation({ summary: "Collector assigned routes for a date/shift" })
  myRoutes(
    @CurrentUser() user: JwtPayload,
    @Query() query: MyRoutesQueryDto,
  ) {
    return this.routesService.myRoutes(user, query);
  }

  @Get()
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("routes:read")
  @ApiOperation({ summary: "List all routes (admin)" })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListRoutesQueryDto) {
    return this.routesService.listAdmin(user, query);
  }

  @Post()
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("routes:write")
  @ApiOperation({ summary: "Create route (admin)" })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRouteDto,
    @Req() req: Request,
  ) {
    return this.routesService.create(user, dto, req.ip);
  }

  @Get(":id/clients")
  @RequirePermissions("routes:read")
  @ApiOperation({ summary: "Ordered client list for route" })
  getClients(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: RouteClientsQueryDto,
  ) {
    return this.routesService.getRouteClients(user, id, query);
  }

  @Put(":id/clients")
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("routes:write")
  @ApiOperation({ summary: "Replace client assignments and visit order" })
  replaceClients(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReplaceRouteClientsDto,
    @Req() req: Request,
  ) {
    return this.routesService.replaceRouteClients(user, id, dto, req.ip);
  }

  @Get(":id/collectors")
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("routes:read")
  @ApiOperation({ summary: "List collector assignments for route" })
  listCollectors(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.routesService.listCollectorAssignments(user, id);
  }

  @Post(":id/collectors")
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("routes:write")
  @ApiOperation({ summary: "Assign collector to route" })
  assignCollector(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignCollectorDto,
    @Req() req: Request,
  ) {
    return this.routesService.assignCollector(user, id, dto, req.ip);
  }

  @Delete(":id/collectors/:assignmentId")
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("routes:write")
  @ApiOperation({ summary: "Remove collector assignment" })
  removeCollector(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("assignmentId", ParseUUIDPipe) assignmentId: string,
    @Req() req: Request,
  ) {
    return this.routesService.removeCollectorAssignment(
      user,
      id,
      assignmentId,
      req.ip,
    );
  }

  @Patch(":id")
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("routes:write")
  @ApiOperation({ summary: "Update route (admin)" })
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRouteDto,
    @Req() req: Request,
  ) {
    return this.routesService.update(user, id, dto, req.ip);
  }

  @Delete(":id")
  @Roles(UserRoleCode.ADMIN)
  @RequirePermissions("routes:write")
  @ApiOperation({ summary: "Soft delete route (admin)" })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.routesService.remove(user, id, req.ip);
  }
}
