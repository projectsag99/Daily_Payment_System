import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Public } from "../../common/decorators/auth.decorators";

@ApiTags("health")
@Controller("health")
@Public()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: "Liveness check" })
  liveness() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness check (DB)" })
  async readiness() {
    try {
      await this.dataSource.query("SELECT 1");
      return {
        status: "ok",
        checks: { database: "up" },
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: "error",
        checks: { database: "down" },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
