import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Request } from "express";
import { ClientsService } from "./clients.service";
import {
  ConfirmDocumentDto,
  CreateClientDto,
  ListClientsQueryDto,
  UpdateClientDto,
  UpdateClientLocationDto,
  UploadUrlRequestDto,
} from "./dto/clients.dto";
import {
  RequireCollectorActive,
  RequirePermissions,
} from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("clients")
@ApiBearerAuth()
@Controller("clients")
@RequireCollectorActive()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermissions("clients:read")
  @ApiOperation({ summary: "List and search clients" })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListClientsQueryDto) {
    return this.clientsService.list(user, query);
  }

  @Get(":id")
  @RequirePermissions("clients:read")
  @ApiOperation({ summary: "Client detail" })
  getById(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.clientsService.getById(user, id);
  }

  @Post()
  @RequirePermissions("clients:write")
  @ApiOperation({ summary: "Create client (admin)" })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateClientDto,
    @Req() req: Request,
  ) {
    return this.clientsService.create(user, dto, req.ip);
  }

  @Patch(":id")
  @RequirePermissions("clients:write")
  @ApiOperation({ summary: "Update client (admin)" })
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @Req() req: Request,
  ) {
    return this.clientsService.update(user, id, dto, req.ip);
  }

  @Delete(":id")
  @RequirePermissions("clients:delete")
  @ApiOperation({ summary: "Soft delete client (admin)" })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.clientsService.softDelete(user, id, req.ip);
  }

  @Patch(":id/location")
  @RequirePermissions("clients:read")
  @ApiOperation({ summary: "Update client geolocation" })
  updateLocation(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientLocationDto,
    @Req() req: Request,
  ) {
    return this.clientsService.updateLocation(user, id, dto, req.ip);
  }

  @Get(":id/location-history")
  @RequirePermissions("clients:read")
  @ApiOperation({ summary: "Client location history" })
  locationHistory(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.clientsService.getLocationHistory(user, id);
  }

  @Get(":id/installments")
  @RequirePermissions("clients:read")
  @ApiOperation({ summary: "Open installments for client" })
  installments(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.clientsService.getInstallments(user, id);
  }

  @Get(":id/payments")
  @RequirePermissions("clients:read")
  @ApiOperation({ summary: "Payment history for client" })
  payments(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.clientsService.getPayments(user, id);
  }
}

@ApiTags("client-documents")
@ApiBearerAuth()
@Controller("clients/:clientId/documents")
@RequireCollectorActive()
export class ClientDocumentsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post("upload-url")
  @RequirePermissions("clients:write")
  @ApiOperation({ summary: "Get presigned upload URL" })
  uploadUrl(
    @CurrentUser() user: JwtPayload,
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: UploadUrlRequestDto,
  ) {
    return this.clientsService.createUploadUrl(user, clientId, dto);
  }

  @Post()
  @RequirePermissions("clients:write")
  @ApiOperation({ summary: "Confirm document upload metadata" })
  confirm(
    @CurrentUser() user: JwtPayload,
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: ConfirmDocumentDto,
    @Req() req: Request,
  ) {
    return this.clientsService.confirmDocument(user, clientId, dto, req.ip);
  }

  @Get()
  @RequirePermissions("clients:read")
  @ApiOperation({ summary: "List client documents" })
  list(
    @CurrentUser() user: JwtPayload,
    @Param("clientId", ParseUUIDPipe) clientId: string,
  ) {
    return this.clientsService.listDocuments(user, clientId);
  }

  @Get(":id/download-url")
  @RequirePermissions("clients:read")
  @ApiOperation({ summary: "Get presigned download URL" })
  downloadUrl(
    @CurrentUser() user: JwtPayload,
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) documentId: string,
    @Req() req: Request,
  ) {
    return this.clientsService.getDocumentDownloadUrl(
      user,
      clientId,
      documentId,
      req.ip,
    );
  }

  @Delete(":id")
  @RequirePermissions("clients:delete")
  @ApiOperation({ summary: "Soft delete document (admin)" })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) documentId: string,
    @Req() req: Request,
  ) {
    return this.clientsService.deleteDocument(user, clientId, documentId, req.ip);
  }
}
