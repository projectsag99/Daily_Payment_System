import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SyncService } from "./sync.service";
import { SyncEventsDto } from "./dto/sync.dto";
import { RequireCollectorActive } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("sync")
@ApiBearerAuth()
@Controller("sync")
@RequireCollectorActive()
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post("events")
  @ApiOperation({ summary: "Batch upload offline sync events" })
  processEvents(@CurrentUser() user: JwtPayload, @Body() dto: SyncEventsDto) {
    return this.syncService.processEvents(user, dto);
  }

  @Get("status")
  @ApiOperation({ summary: "Sync health and recent activity" })
  getStatus(
    @CurrentUser() user: JwtPayload,
    @Query("deviceId") deviceId?: string,
  ) {
    return this.syncService.getStatus(user, deviceId);
  }
}
