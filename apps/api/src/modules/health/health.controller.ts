import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Response } from "express";
import { Public } from "../../common/decorators/auth.decorators";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
@Public()
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Liveness check" })
  liveness() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness check (DB, Redis, storage)" })
  async readiness(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.readiness();
    if (result.status === "error") {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    } else if (result.status === "degraded") {
      res.status(HttpStatus.OK);
    }
    return result;
  }
}
