import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiErrorCode, UserRoleCode } from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { todayInTimezone } from "../clients/domain/client.types";
import { RoutesRepository } from "../routes/repositories/routes.repository";
import { StorageService } from "../storage/storage.service";
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
import { CashBoxRepository } from "./repositories/cash-box.repository";
import {
  formatSpreadsheetDate,
  isInactiveCashBoxDay,
  listDatesInclusive,
  parseMonthParam,
  weekdayLabelEs,
} from "./domain/spreadsheet-calendar";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export type UploadedReceiptFile = {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
};

export interface BuiltDaySummary {
  date: string;
  collected: number;
  paymentsCount: number;
  renewalsOut: number;
  renewalsCount: number;
  expensesTotal: number;
  dailyNet: number;
  accumulatedBalance: number;
  expenses: Array<{ id: string; amount: number; description: string }>;
}

export interface BuiltPeriodSummary {
  days: BuiltDaySummary[];
  totalCollected: number;
  totalRenewalsOut: number;
  totalExpenses: number;
  accumulatedBalance: number;
}

@Injectable()
export class CashBoxService {
  private readonly timezone: string;

  constructor(
    private readonly cashBoxRepository: CashBoxRepository,
    private readonly routesRepository: RoutesRepository,
    private readonly storageService: StorageService,
    configService: ConfigService,
  ) {
    this.timezone = configService.get<string>("timezone", "America/Montevideo");
  }

  private resolveCollectorId(user: JwtPayload, collectorId?: string): string {
    if (user.role === UserRoleCode.ADMIN) {
      if (!collectorId) {
        throw new ForbiddenException({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: "Indica el cobrador para consultar la caja",
        });
      }
      return collectorId;
    }
    return user.sub;
  }

  private resolveExpenseCollectorId(
    user: JwtPayload,
    collectorId?: string,
  ): string {
    if (user.role === UserRoleCode.ADMIN) {
      if (!collectorId) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: "Indica el cobrador al que corresponde el gasto",
        });
      }
      return collectorId;
    }
    return user.sub;
  }

  private assertAdmin(user: JwtPayload): void {
    if (user.role !== UserRoleCode.ADMIN) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Solo el administrador puede realizar esta acción",
      });
    }
  }

  private resolveDateRange(query: CashBoxSummaryQueryDto): {
    from: string;
    to: string;
  } {
    const today = todayInTimezone(this.timezone);
    const to = query.to ?? today;
    const from =
      query.from ??
      (() => {
        const date = new Date(`${to}T12:00:00`);
        date.setDate(date.getDate() - 29);
        return date.toISOString().slice(0, 10);
      })();
    return { from, to };
  }

  private async buildPeriodSummary(
    collectorId: string,
    from: string,
    to: string,
    filterRouteId?: string,
    options?: { includeInitialBalance?: boolean },
  ): Promise<BuiltPeriodSummary> {
    const includeInitialBalance = options?.includeInitialBalance ?? !filterRouteId;
    const periodStart = await this.cashBoxRepository.getPeriodStart(collectorId);
    const effectiveFrom =
      periodStart && periodStart > from ? periodStart : from;

    const [totals, dailyRows, expenses, netBeforeRange, initialBalance] =
      await Promise.all([
        this.cashBoxRepository.getTotals(
          collectorId,
          filterRouteId,
          periodStart,
        ),
        this.cashBoxRepository.getDailyRows(
          collectorId,
          effectiveFrom,
          to,
          filterRouteId,
        ),
        this.cashBoxRepository.getExpensesForRange(
          collectorId,
          effectiveFrom,
          to,
          filterRouteId,
        ),
        this.cashBoxRepository.getNetBeforeDate(
          collectorId,
          effectiveFrom,
          filterRouteId,
          periodStart,
        ),
        this.cashBoxRepository.getInitialBalance(collectorId),
      ]);

    const expensesByDate = new Map<string, typeof expenses>();
    for (const expense of expenses) {
      const dateKey = expense.expense_date.slice(0, 10);
      const list = expensesByDate.get(dateKey) ?? [];
      list.push(expense);
      expensesByDate.set(dateKey, list);
    }

    let runningBalance = roundMoney(
      netBeforeRange + (includeInitialBalance ? initialBalance : 0),
    );
    const chronological = [...dailyRows].reverse();
    const daysWithBalance = chronological.map((row) => {
      const collected = roundMoney(Number(row.collected));
      const renewalsOut = roundMoney(Number(row.renewals_out));
      const expensesTotal = roundMoney(Number(row.expenses_total));
      const dailyNet = roundMoney(collected - renewalsOut - expensesTotal);
      runningBalance = roundMoney(runningBalance + dailyNet);

      return {
        date: row.day.slice(0, 10),
        collected,
        paymentsCount: Number(row.payments_count),
        renewalsOut,
        renewalsCount: Number(row.renewals_count),
        expensesTotal,
        dailyNet,
        accumulatedBalance: runningBalance,
        expenses: (expensesByDate.get(row.day.slice(0, 10)) ?? []).map(
          (item) => ({
            id: item.id,
            amount: roundMoney(Number(item.amount)),
            description: item.description,
          }),
        ),
      };
    });

    const totalCollected = roundMoney(Number(totals.total_collected));
    const totalRenewalsOut = roundMoney(Number(totals.total_renewals_out));
    const totalExpenses = roundMoney(Number(totals.total_expenses));
    const accumulatedBalance = roundMoney(
      (includeInitialBalance ? initialBalance : 0) +
        totalCollected -
        totalRenewalsOut -
        totalExpenses,
    );

    return {
      days: daysWithBalance.reverse(),
      totalCollected,
      totalRenewalsOut,
      totalExpenses,
      accumulatedBalance,
    };
  }

  private async assertRouteAccess(
    user: JwtPayload,
    collectorId: string,
    routeId: string,
    visitDate: string,
  ): Promise<void> {
    if (user.role === UserRoleCode.ADMIN) {
      return;
    }
    if (user.sub !== collectorId) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "No tienes acceso a esta ruta",
      });
    }
    const allowed = await this.routesRepository.canCollectorAccessRoute(
      routeId,
      collectorId,
      visitDate,
    );
    if (!allowed) {
      throw new ForbiddenException({
        code: ApiErrorCode.ROUTE_ACCESS_DENIED,
        message: "No tienes acceso a esta ruta",
      });
    }
  }

  async getInitialBalance(user: JwtPayload, collectorIdParam?: string) {
    const collectorId = this.resolveCollectorId(user, collectorIdParam);
    const record =
      await this.cashBoxRepository.findInitialBalanceRecord(collectorId);

    return {
      collectorId,
      amount: roundMoney(record ? Number(record.amount) : 0),
      notes: record?.notes ?? null,
      updatedAt: record?.updatedAt ?? null,
    };
  }

  async setInitialBalance(
    user: JwtPayload,
    dto: SetCashBoxInitialBalanceDto,
  ) {
    this.assertAdmin(user);

    const record = await this.cashBoxRepository.upsertInitialBalance({
      collectorId: dto.collectorId,
      amount: dto.amount,
      notes: dto.notes,
      setById: user.sub,
    });

    return {
      collectorId: record.collectorId,
      amount: roundMoney(Number(record.amount)),
      notes: record.notes,
      updatedAt: record.updatedAt,
    };
  }

  async getSummary(user: JwtPayload, query: CashBoxSummaryQueryDto) {
    const collectorId = this.resolveCollectorId(user, query.collectorId);
    const { from, to } = this.resolveDateRange(query);
    const routeId = query.routeId ?? null;

    const assignedRoutes = await this.cashBoxRepository.findAssignedRoutes(
      collectorId,
      from,
      to,
    );

    if (routeId) {
      const isAssigned = assignedRoutes.some((route) => route.id === routeId);
      if (!isAssigned) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: "La ruta seleccionada no está asignada a este cobrador",
        });
      }
      await this.assertRouteAccess(user, collectorId, routeId, to);
    }

    const filterRouteId = routeId ?? undefined;

    const period = await this.buildPeriodSummary(
      collectorId,
      from,
      to,
      filterRouteId,
    );

    let routeBreakdowns:
      | Array<{
          routeId: string;
          routeName: string;
          shift: string;
          days: BuiltDaySummary[];
        }>
      | undefined;

    if (!routeId && assignedRoutes.length > 1) {
      routeBreakdowns = await Promise.all(
        assignedRoutes.map(async (route) => {
          const routePeriod = await this.buildPeriodSummary(
            collectorId,
            from,
            to,
            route.id,
            { includeInitialBalance: false },
          );
          return {
            routeId: route.id,
            routeName: route.name,
            shift: route.shift,
            days: routePeriod.days,
          };
        }),
      );
    }

    const initialBalance = await this.cashBoxRepository.getInitialBalance(
      collectorId,
    );
    const periodStart = await this.cashBoxRepository.getPeriodStart(collectorId);

    return {
      from,
      to,
      collectorId,
      routeId,
      periodStart,
      routes: assignedRoutes.map((route) => ({
        id: route.id,
        name: route.name,
        shift: route.shift,
      })),
      summary: {
        initialBalance: roundMoney(initialBalance),
        totalCollected: period.totalCollected,
        totalRenewalsOut: period.totalRenewalsOut,
        totalExpenses: period.totalExpenses,
        accumulatedBalance: period.accumulatedBalance,
      },
      days: period.days,
      routeBreakdowns,
    };
  }

  async getDayDetails(
    user: JwtPayload,
    date: string,
    query: CashBoxDayDetailsQueryDto,
  ) {
    const collectorId = this.resolveCollectorId(user, query.collectorId);
    const routeId = query.routeId ?? undefined;
    const section = query.section;

    if (routeId) {
      await this.assertRouteAccess(user, collectorId, routeId, date);
    }

    const includeEntradas = !section || section === "entradas";
    const includeSalidas = !section || section === "salidas";
    const includeOffice = !section || section === "office";

    const [payments, disbursements, expenseRows] = await Promise.all([
      includeEntradas
        ? this.cashBoxRepository.getPaymentsForDay(collectorId, date, routeId)
        : Promise.resolve([]),
      includeSalidas
        ? this.cashBoxRepository.getDisbursementsForDay(
            collectorId,
            date,
            routeId,
          )
        : Promise.resolve([]),
      includeOffice
        ? this.cashBoxRepository.getOfficeExpensesForDay(collectorId, date)
        : Promise.resolve([]),
    ]);

    const expenseIds = expenseRows.map((row) => row.id);
    const receiptRows =
      expenseIds.length > 0
        ? await this.cashBoxRepository.listReceiptsForExpenseIds(expenseIds)
        : [];

    return {
      date,
      routeId: routeId ?? null,
      section: section ?? null,
      payments: payments.map((row) => ({
        id: row.id,
        amount: roundMoney(Number(row.amount)),
        capturedAt: row.captured_at,
        clientCode: row.client_code,
        clientName: row.client_name,
      })),
      renewals: disbursements.map((row) => ({
        id: row.id,
        amount: roundMoney(Number(row.amount)),
        createdAt: row.created_at,
        clientCode: row.client_code,
        clientName: row.client_name,
        kind: row.kind,
      })),
      expenses: this.mapExpensesWithReceipts(expenseRows, receiptRows),
    };
  }

  private mapExpensesWithReceipts(
    expenseRows: Awaited<
      ReturnType<CashBoxRepository["getExpensesForRange"]>
    >,
    receiptRows: Awaited<
      ReturnType<CashBoxRepository["listReceiptsForExpenseIds"]>
    >,
  ) {
    const receiptsByExpense = new Map<string, typeof receiptRows>();
    for (const receipt of receiptRows) {
      const list = receiptsByExpense.get(receipt.expense_id) ?? [];
      list.push(receipt);
      receiptsByExpense.set(receipt.expense_id, list);
    }

    return expenseRows.map((row) => ({
      id: row.id,
      amount: roundMoney(Number(row.amount)),
      description: row.description,
      reportedAt: row.created_at,
      routeId: row.route_id,
      routeName: row.route_name,
      receipts: (receiptsByExpense.get(row.id) ?? []).map((receipt) => ({
        id: receipt.id,
        mimeType: receipt.mime_type,
        originalFileName: receipt.original_file_name,
        uploadedAt: receipt.created_at,
      })),
    }));
  }

  async createExpenseWithReceipts(
    user: JwtPayload,
    dto: CreateCashBoxExpenseDto,
    files: UploadedReceiptFile[] = [],
  ) {
    const created = await this.createExpense(user, dto);
    if (files.length > 0) {
      await this.attachReceiptsToExpense(user, created.id, files);
    }
    const collectorId = this.resolveExpenseCollectorId(user, dto.collectorId);
    const expenseRows = await this.cashBoxRepository.getExpensesForRange(
      collectorId,
      dto.expenseDate,
      dto.expenseDate,
    );
    const row = expenseRows.find((item) => item.id === created.id);
    const receiptRows = await this.cashBoxRepository.listReceiptsForExpenseIds([
      created.id,
    ]);
    const mapped = row
      ? this.mapExpensesWithReceipts([row], receiptRows)[0]
      : null;
    return {
      ...created,
      expense: mapped,
    };
  }

  async createExpenseReceiptUploadUrl(
    user: JwtPayload,
    expenseId: string,
    dto: ExpenseReceiptUploadUrlDto,
  ) {
    const expense = await this.cashBoxRepository.findExpenseById(expenseId);
    if (!expense) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: "Gasto no encontrado",
      });
    }
    await this.assertExpenseAccess(user, expense);

    const mimeType = dto.mimeType.toLowerCase();
    if (!RECEIPT_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Solo se permiten imágenes (JPEG, PNG, WEBP, HEIC)",
      });
    }

    const storageKey = this.storageService.buildExpenseReceiptStorageKey(
      expenseId,
      dto.fileName ?? "factura.jpg",
    );
    const { uploadUrl, expiresIn } = await this.storageService.getUploadUrl(
      storageKey,
      mimeType,
    );

    return { uploadUrl, storageKey, expiresIn };
  }

  async confirmExpenseReceipt(
    user: JwtPayload,
    expenseId: string,
    dto: ConfirmExpenseReceiptDto,
  ) {
    const expense = await this.cashBoxRepository.findExpenseById(expenseId);
    if (!expense) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: "Gasto no encontrado",
      });
    }
    await this.assertExpenseAccess(user, expense);

    if (
      !this.storageService.isStorageKeyForExpense(dto.storageKey, expenseId)
    ) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Clave de almacenamiento inválida para este gasto",
      });
    }

    const mimeType = dto.mimeType.toLowerCase();
    if (!RECEIPT_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Solo se permiten imágenes (JPEG, PNG, WEBP, HEIC)",
      });
    }

    const receipt = await this.cashBoxRepository.createExpenseReceipt({
      expenseId,
      storageKey: dto.storageKey,
      mimeType,
      originalFileName: dto.originalFileName ?? null,
    });

    return {
      id: receipt.id,
      mimeType: receipt.mimeType,
      originalFileName: receipt.originalFileName,
      uploadedAt: receipt.createdAt,
    };
  }

  async addExpenseReceiptsFromBase64(
    user: JwtPayload,
    expenseId: string,
    dto: UploadExpenseReceiptsDto,
  ) {
    const files: UploadedReceiptFile[] = dto.receipts.map((receipt, index) => {
      const raw = receipt.dataBase64.trim();
      const payload = raw.includes(",")
        ? raw.slice(raw.indexOf(",") + 1)
        : raw;
      let buffer: Buffer;
      try {
        buffer = Buffer.from(payload, "base64");
      } catch {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: `Factura ${index + 1}: datos base64 inválidos`,
        });
      }
      if (buffer.length === 0) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: `Factura ${index + 1}: archivo vacío`,
        });
      }
      if (buffer.length > 10 * 1024 * 1024) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: `Factura ${index + 1}: máximo 10 MB por imagen`,
        });
      }
      return {
        buffer,
        mimetype: receipt.mimeType,
        originalname: receipt.originalFileName ?? `factura-${index + 1}.jpg`,
      };
    });

    await this.attachReceiptsToExpense(user, expenseId, files);

    const receiptRows =
      await this.cashBoxRepository.listReceiptsForExpenseIds([expenseId]);
    return {
      expenseId,
      receipts: receiptRows.map((receipt) => ({
        id: receipt.id,
        mimeType: receipt.mime_type,
        originalFileName: receipt.original_file_name,
        uploadedAt: receipt.created_at,
      })),
    };
  }

  private async attachReceiptsToExpense(
    user: JwtPayload,
    expenseId: string,
    files: UploadedReceiptFile[],
  ) {
    const expense = await this.cashBoxRepository.findExpenseById(expenseId);
    if (!expense) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: "Gasto no encontrado",
      });
    }
    await this.assertExpenseAccess(user, expense);

    for (const file of files) {
      const mimeType = (file.mimetype ?? "image/jpeg").toLowerCase();
      if (!RECEIPT_MIME_TYPES.has(mimeType)) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: "Solo se permiten imágenes (JPEG, PNG, WEBP, HEIC)",
        });
      }
      const originalName = file.originalname ?? "factura.jpg";
      const storageKey = this.storageService.buildExpenseReceiptStorageKey(
        expenseId,
        originalName,
      );
      await this.storageService.putObject(storageKey, file.buffer, mimeType);
      await this.cashBoxRepository.createExpenseReceipt({
        expenseId,
        storageKey,
        mimeType,
        originalFileName: originalName,
      });
    }
  }

  async getExpenseReceiptContent(
    user: JwtPayload,
    expenseId: string,
    receiptId: string,
  ) {
    const expense = await this.cashBoxRepository.findExpenseById(expenseId);
    if (!expense) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: "Gasto no encontrado",
      });
    }
    await this.assertExpenseAccess(user, expense);

    const receipt = await this.cashBoxRepository.findReceiptById(receiptId);
    if (!receipt || receipt.expenseId !== expenseId) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: "Factura no encontrada",
      });
    }
    if (
      !this.storageService.isStorageKeyForExpense(receipt.storageKey, expenseId)
    ) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Acceso denegado",
      });
    }

    return this.storageService.getObjectStream(receipt.storageKey);
  }

  private async assertExpenseAccess(
    user: JwtPayload,
    expense: {
      collectorId: string;
      routeId: string | null;
      expenseDate: string;
      category?: "route" | "office";
    },
  ) {
    if (user.role === UserRoleCode.ADMIN) return;
    if (expense.collectorId !== user.sub) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "No tienes acceso a este gasto",
      });
    }
    if (expense.routeId && expense.category !== "office") {
      await this.assertRouteAccess(
        user,
        expense.collectorId,
        expense.routeId,
        expense.expenseDate,
      );
    }
  }

  async createExpense(user: JwtPayload, dto: CreateCashBoxExpenseDto) {
    const collectorId = this.resolveExpenseCollectorId(user, dto.collectorId);
    const { from, to } = this.resolveDateRange({
      from: dto.expenseDate,
      to: dto.expenseDate,
    });
    const assignedRoutes = await this.cashBoxRepository.findAssignedRoutes(
      collectorId,
      from,
      to,
    );

    let routeId = dto.routeId ?? null;
    const category = dto.category ?? "office";

    if (
      assignedRoutes.length === 1 &&
      routeId == null &&
      category !== "office"
    ) {
      routeId = assignedRoutes[0].id;
    }

    if (routeId) {
      await this.assertRouteAccess(user, collectorId, routeId, dto.expenseDate);
    }

    const expense = await this.cashBoxRepository.createExpense({
      collectorId,
      expenseDate: dto.expenseDate,
      amount: dto.amount,
      description: dto.description,
      createdById: user.sub,
      routeId,
      category,
    });

    return {
      id: expense.id,
      expenseDate: expense.expenseDate,
      routeId: expense.routeId,
      category: expense.category,
      amount: roundMoney(Number(expense.amount)),
      description: expense.description,
    };
  }

  async deleteExpense(user: JwtPayload, expenseId: string) {
    const expense = await this.cashBoxRepository.findExpenseById(expenseId);
    if (!expense) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: "Gasto no encontrado",
      });
    }

    if (
      user.role !== UserRoleCode.ADMIN &&
      expense.collectorId !== user.sub
    ) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "No puedes eliminar este gasto",
      });
    }

    await this.cashBoxRepository.deleteExpense(expenseId);
    return { message: "Gasto eliminado" };
  }

  async resetPeriod(
    user: JwtPayload,
    dto: ResetCashBoxPeriodDto,
  ) {
    this.assertAdmin(user);
    const effectiveFrom = dto.effectiveFrom ?? todayInTimezone(this.timezone);
    const result = await this.cashBoxRepository.upsertPeriodStart({
      collectorId: dto.collectorId,
      effectiveFrom,
      notes: dto.notes ?? null,
      setById: user.sub,
    });
    return {
      collectorId: dto.collectorId,
      effectiveFrom: result.effectiveFrom,
      notes: result.notes,
      message:
        "Caja reiniciada. El cobrador continuará solo con la base inicial y los movimientos desde esta fecha.",
    };
  }

  async getSpreadsheet(user: JwtPayload, query: CashBoxSpreadsheetQueryDto) {
    const collectorId = this.resolveCollectorId(user, query.collectorId);
    let monthMeta: ReturnType<typeof parseMonthParam>;
    try {
      monthMeta = parseMonthParam(query.month);
    } catch {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Mes inválido. Usa el formato YYYY-MM",
      });
    }

    const { from, to, label } = monthMeta;
    const routes = await this.cashBoxRepository.findAssignedRoutes(
      collectorId,
      from,
      to,
    );

    const periodStart = await this.cashBoxRepository.getPeriodStart(collectorId);
    const initialBalance = await this.cashBoxRepository.getInitialBalance(
      collectorId,
    );
    const netBeforeMonth = await this.cashBoxRepository.getNetBeforeDate(
      collectorId,
      from,
      undefined,
      periodStart,
    );

    const [
      collections,
      loanDisbursements,
      officeExpenses,
      holidays,
      allExpenses,
    ] = await Promise.all([
      this.cashBoxRepository.getDailyCollectionsByRoute(collectorId, from, to),
      this.cashBoxRepository.getDailyRenewalsByRoute(collectorId, from, to),
      this.cashBoxRepository.getDailyOfficeExpenses(collectorId, from, to),
      this.cashBoxRepository.getNonWorkingDaysInRange(from, to),
      this.cashBoxRepository.getExpensesForRange(collectorId, from, to),
    ]);

    const allExpenseIds = allExpenses.map((row) => row.id);
    const allReceiptRows =
      await this.cashBoxRepository.listReceiptsForExpenseIds(allExpenseIds);
    const receiptCountByExpense = new Map<string, number>();
    for (const receipt of allReceiptRows) {
      receiptCountByExpense.set(
        receipt.expense_id,
        (receiptCountByExpense.get(receipt.expense_id) ?? 0) + 1,
      );
    }

    const holidayMap = new Map(
      holidays.map((row) => [row.day_date.slice(0, 10), row.label]),
    );

    const amountAt = (
      rows: Array<{ day: string; route_id: string; total: string }>,
      date: string,
      routeId: string,
    ) =>
      roundMoney(
        Number(
          rows.find(
            (row) =>
              row.day.slice(0, 10) === date && row.route_id === routeId,
          )?.total ?? 0,
        ),
      );

    const officeAt = (date: string) =>
      roundMoney(
        Number(
          officeExpenses.find((row) => row.day.slice(0, 10) === date)?.total ??
            0,
        ),
      );

    const dayExpensesForDate = (date: string) =>
      allExpenses
        .filter((expense) => expense.expense_date.slice(0, 10) === date)
        .map((expense) => ({
          id: expense.id,
          description: expense.description,
          amount: roundMoney(Number(expense.amount)),
          reportedAt: expense.created_at,
          receiptCount: receiptCountByExpense.get(expense.id) ?? 0,
        }));

    const specsForDay = (date: string): string => {
      const parts: string[] = [];
      for (const expense of allExpenses) {
        const expenseDate = expense.expense_date.slice(0, 10);
        if (expenseDate !== date) continue;
        parts.push(expense.description);
      }
      return parts.join(" / ");
    };

    let runningBase = roundMoney(netBeforeMonth + initialBalance);
    const effectiveFrom =
      periodStart && periodStart > from ? periodStart : from;

    const rows = listDatesInclusive(from, to).map((date) => {
      const { inactive, isSunday: sunday, holidayLabel } = isInactiveCashBoxDay(
        date,
        holidayMap,
      );
      const base = runningBase;

      const entradas = Object.fromEntries(
        routes.map((route) => [
          route.id,
          inactive || date < effectiveFrom
            ? 0
            : amountAt(collections, date, route.id),
        ]),
      ) as Record<string, number>;

      const salidas = Object.fromEntries(
        routes.map((route) => [
          route.id,
          inactive || date < effectiveFrom
            ? 0
            : amountAt(loanDisbursements, date, route.id),
        ]),
      ) as Record<string, number>;

      const salidaOficina =
        inactive || date < effectiveFrom ? 0 : officeAt(date);

      let especificacion = "";
      if (holidayLabel) {
        especificacion = holidayLabel.toUpperCase();
      } else if (!inactive && date >= effectiveFrom) {
        especificacion = specsForDay(date);
      }

      const totalEntradas = roundMoney(
        Object.values(entradas).reduce((sum, value) => sum + value, 0),
      );
      const totalSalidas = roundMoney(
        Object.values(salidas).reduce((sum, value) => sum + value, 0) +
          salidaOficina,
      );

      if (!inactive && date >= effectiveFrom) {
        runningBase = roundMoney(base + totalEntradas - totalSalidas);
      }

      return {
        date,
        dateLabel: formatSpreadsheetDate(date),
        dayName: weekdayLabelEs(date),
        base,
        entradas,
        salidas,
        salidaOficina,
        especificacion,
        dayExpenses:
          inactive || date < effectiveFrom ? [] : dayExpensesForDate(date),
        isSunday: sunday,
        isHoliday: holidayLabel != null,
        inactive,
        totalEntradas,
        totalSalidas,
      };
    });

    return {
      month: query.month,
      title: label,
      from,
      to,
      collectorId,
      periodStart,
      routes: routes.map((route) => ({
        id: route.id,
        name: route.name,
        shift: route.shift,
      })),
      summary: {
        initialBalance: roundMoney(initialBalance),
        totalEnCaja: runningBase,
      },
      rows,
    };
  }
}
