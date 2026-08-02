import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequireCollectorActive } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("dashboard")
@ApiBearerAuth()
@Controller("dashboard")
@RequireCollectorActive()
export class DashboardController {
  @Get("collector")
  @ApiOperation({ summary: "Collector dashboard stub (requires active status)" })
  collectorDashboard(@CurrentUser() user: JwtPayload) {
    return {
      message: "Acceso autorizado al panel del cobrador",
      userId: user.sub,
      collectorStatus: user.collectorStatus,
    };
  }
}
