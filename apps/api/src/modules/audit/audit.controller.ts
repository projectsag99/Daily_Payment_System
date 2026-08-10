import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuditQueryService } from "./audit-query.service";
import { ListAuditQueryDto } from "./dto/audit.dto";
import { Roles, RequirePermissions } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRoleCode } from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("audit")
@ApiBearerAuth()
@Controller("audit")
@Roles(UserRoleCode.ADMIN)
export class AuditController {
  constructor(private readonly auditQueryService: AuditQueryService) {}

  @Get()
  @RequirePermissions("audit:read")
  @ApiOperation({ summary: "Query audit logs (admin)" })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListAuditQueryDto) {
    return this.auditQueryService.list(user, query);
  }
}
