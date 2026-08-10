import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import {
  ListNotificationsQueryDto,
  RegisterDeviceDto,
} from "./dto/notifications.dto";
import { RequireCollectorActive } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
@RequireCollectorActive()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Collector notification inbox" })
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.listInbox(user, query);
  }

  @Post("register-device")
  @ApiOperation({ summary: "Register FCM device token" })
  registerDevice(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.notificationsService.registerDevice(user, dto);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark notification as read" })
  markRead(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markRead(user, id);
  }
}
