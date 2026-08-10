import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { ReceiptsService } from "./receipts.service";
import { Public } from "../../common/decorators/auth.decorators";

@ApiTags("public-receipts")
@Controller("public/receipts")
@Public()
@SkipThrottle()
export class PublicReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(":token")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Public sanitized receipt view (no auth)" })
  getByToken(@Param("token") token: string) {
    return this.receiptsService.getPublicByToken(token);
  }
}
