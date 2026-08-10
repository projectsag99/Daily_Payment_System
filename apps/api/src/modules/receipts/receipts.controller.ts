import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Body,
  Req,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Request } from "express";
import { ReceiptsService } from "./receipts.service";
import { CreateReceiptLinkDto } from "./dto/receipts.dto";
import {
  RequireCollectorActive,
  RequirePermissions,
} from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("receipts")
@ApiBearerAuth()
@Controller("receipts")
@RequireCollectorActive()
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(":id/download-url")
  @RequirePermissions("receipts:read")
  @ApiOperation({ summary: "Signed PDF download URL" })
  getDownloadUrl(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.receiptsService.getDownloadUrl(user, id);
  }

  @Post(":id/links")
  @RequirePermissions("receipts:read")
  @ApiOperation({ summary: "Create or reissue public receipt link" })
  createLink(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateReceiptLinkDto,
  ) {
    return this.receiptsService.createLink(user, id, dto);
  }

  @Get(":id/links")
  @RequirePermissions("receipts:read")
  @ApiOperation({ summary: "List receipt links" })
  listLinks(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.receiptsService.listLinks(user, id);
  }

  @Patch(":id/links/:linkId/revoke")
  @RequirePermissions("receipts:read")
  @ApiOperation({ summary: "Revoke a receipt link" })
  revokeLink(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("linkId", ParseUUIDPipe) linkId: string,
    @Req() req: Request,
  ) {
    return this.receiptsService.revokeLink(user, id, linkId, req.ip);
  }

  @Get(":id")
  @RequirePermissions("receipts:read")
  @ApiOperation({ summary: "Receipt metadata" })
  getById(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.receiptsService.getById(user, id);
  }
}
