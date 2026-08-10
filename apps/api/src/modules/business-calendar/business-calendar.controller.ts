import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { BusinessCalendarService } from "./business-calendar.service";

class CreateNonWorkingDayDto {
  dayDate!: string;
  label!: string;
}

@ApiTags("calendar")
@ApiBearerAuth()
@Controller("calendar")
export class BusinessCalendarController {
  constructor(
    private readonly businessCalendarService: BusinessCalendarService,
  ) {}

  @Get("non-working-days")
  @RequirePermissions("calendar:manage")
  @ApiOperation({ summary: "List non-working days in range" })
  list(
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.businessCalendarService.list(from, to);
  }

  @Post("non-working-days")
  @RequirePermissions("calendar:manage")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create non-working day" })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateNonWorkingDayDto,
  ) {
    return this.businessCalendarService.create(
      dto.dayDate,
      dto.label,
      user.sub,
    );
  }

  @Delete("non-working-days/:id")
  @RequirePermissions("calendar:manage")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete non-working day" })
  async remove(@Param("id") id: string): Promise<void> {
    await this.businessCalendarService.remove(id);
  }
}
