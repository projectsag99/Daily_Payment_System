import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  ParseUUIDPipe,
  Req,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from "@nestjs/swagger";
import { FilesInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import {
  RequireCollectorActive,
  RequirePermissions,
} from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { CashBoxService, UploadedReceiptFile } from "./cash-box.service";
import {
  CashBoxSummaryQueryDto,
  CashBoxDayDetailsQueryDto,
  CashBoxSpreadsheetQueryDto,
  CreateCashBoxExpenseDto,
  SetCashBoxInitialBalanceDto,
  ResetCashBoxPeriodDto,
  UploadExpenseReceiptsDto,
  ExpenseReceiptUploadUrlDto,
  ConfirmExpenseReceiptDto,
} from "./dto/cash-box.dto";

@ApiTags("cash-box")
@ApiBearerAuth()
@Controller("cash-box")
@RequireCollectorActive()
export class CashBoxController {
  constructor(private readonly cashBoxService: CashBoxService) {}

  @Get("summary")
  @RequirePermissions("cashbox:read")
  @ApiOperation({ summary: "Daily cash box summary for collector" })
  summary(
    @CurrentUser() user: JwtPayload,
    @Query() query: CashBoxSummaryQueryDto,
  ) {
    return this.cashBoxService.getSummary(user, query);
  }

  @Get("initial-balance")
  @RequirePermissions("cashbox:read")
  @ApiOperation({ summary: "Initial cash base assigned to a collector" })
  initialBalance(
    @CurrentUser() user: JwtPayload,
    @Query("collectorId") collectorId?: string,
  ) {
    return this.cashBoxService.getInitialBalance(user, collectorId);
  }

  @Put("initial-balance")
  @RequirePermissions("cashbox:write")
  @ApiOperation({ summary: "Set initial cash base for a collector (admin)" })
  setInitialBalance(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SetCashBoxInitialBalanceDto,
  ) {
    return this.cashBoxService.setInitialBalance(user, dto);
  }

  @Post("reset-period")
  @RequirePermissions("cashbox:write")
  @ApiOperation({
    summary: "Reset collector cash box period to zero (admin)",
  })
  resetPeriod(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResetCashBoxPeriodDto,
  ) {
    return this.cashBoxService.resetPeriod(user, dto);
  }

  @Get("spreadsheet")
  @RequirePermissions("cashbox:read")
  @ApiOperation({ summary: "Monthly cash box ledger in spreadsheet layout" })
  spreadsheet(
    @CurrentUser() user: JwtPayload,
    @Query() query: CashBoxSpreadsheetQueryDto,
  ) {
    return this.cashBoxService.getSpreadsheet(user, query);
  }

  @Get("days/:date")
  @RequirePermissions("cashbox:read")
  @ApiOperation({ summary: "Detailed collections, renewals and expenses for a day" })
  dayDetails(
    @CurrentUser() user: JwtPayload,
    @Param("date") date: string,
    @Query() query: CashBoxDayDetailsQueryDto,
  ) {
    return this.cashBoxService.getDayDetails(user, date, query);
  }

  @Post("expenses")
  @RequirePermissions("cashbox:write")
  @ApiOperation({ summary: "Register a logistics expense" })
  createExpense(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCashBoxExpenseDto,
  ) {
    return this.cashBoxService.createExpense(user, dto);
  }

  @Post("expenses/with-receipts")
  @RequirePermissions("cashbox:write")
  @UseInterceptors(
    FilesInterceptor("receipts", 10, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Register a logistics expense with invoice photos (collector app)",
  })
  createExpenseWithReceipts(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCashBoxExpenseDto,
    @UploadedFiles()
    files?: Array<{
      buffer: Buffer;
      mimetype?: string;
      originalname?: string;
    }>,
  ) {
    const mapped: UploadedReceiptFile[] = (files ?? []).map((file) => ({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
    }));
    return this.cashBoxService.createExpenseWithReceipts(user, dto, mapped);
  }

  @Post("expenses/:expenseId/receipts/upload-url")
  @RequirePermissions("cashbox:write")
  @ApiOperation({ summary: "Presigned URL to upload an expense receipt photo" })
  createExpenseReceiptUploadUrl(
    @CurrentUser() user: JwtPayload,
    @Param("expenseId", ParseUUIDPipe) expenseId: string,
    @Body() dto: ExpenseReceiptUploadUrlDto,
  ) {
    return this.cashBoxService.createExpenseReceiptUploadUrl(
      user,
      expenseId,
      dto,
    );
  }

  @Post("expenses/:expenseId/receipts/confirm")
  @RequirePermissions("cashbox:write")
  @ApiOperation({ summary: "Confirm receipt after direct upload to storage" })
  confirmExpenseReceipt(
    @CurrentUser() user: JwtPayload,
    @Param("expenseId", ParseUUIDPipe) expenseId: string,
    @Body() dto: ConfirmExpenseReceiptDto,
  ) {
    return this.cashBoxService.confirmExpenseReceipt(user, expenseId, dto);
  }

  @Post("expenses/:expenseId/receipts")
  @RequirePermissions("cashbox:write")
  @ApiOperation({
    summary:
      "Attach invoice photos to an existing expense (JSON base64 — mobile / tunnel friendly)",
  })
  addExpenseReceipts(
    @CurrentUser() user: JwtPayload,
    @Param("expenseId", ParseUUIDPipe) expenseId: string,
    @Body() dto: UploadExpenseReceiptsDto,
  ) {
    return this.cashBoxService.addExpenseReceiptsFromBase64(
      user,
      expenseId,
      dto,
    );
  }

  @Get("expenses/:expenseId/receipts/:receiptId/content")
  @RequirePermissions("cashbox:read")
  @ApiOperation({ summary: "Stream expense receipt image through API" })
  async receiptContent(
    @CurrentUser() user: JwtPayload,
    @Param("expenseId", ParseUUIDPipe) expenseId: string,
    @Param("receiptId", ParseUUIDPipe) receiptId: string,
    @Req() _req: Request,
  ) {
    const { body, contentType } =
      await this.cashBoxService.getExpenseReceiptContent(
        user,
        expenseId,
        receiptId,
      );
    return new StreamableFile(body, {
      type: contentType,
      disposition: "inline",
    });
  }

  @Delete("expenses/:id")
  @RequirePermissions("cashbox:write")
  @ApiOperation({ summary: "Delete a logistics expense" })
  deleteExpense(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.cashBoxService.deleteExpense(user, id);
  }
}
