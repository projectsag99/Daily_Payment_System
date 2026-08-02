import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ReceiptsService } from "./receipts.service";
import { Public } from "../../common/decorators/auth.decorators";

@ApiTags("public-receipts")
@Controller("public/receipts")
@Public()
export class PublicReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(":token")
  @ApiOperation({ summary: "Public sanitized receipt view (no auth)" })
  getByToken(@Param("token") token: string) {
    return this.receiptsService.getPublicByToken(token);
  }
}
