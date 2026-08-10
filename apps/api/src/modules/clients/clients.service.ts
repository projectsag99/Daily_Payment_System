import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ClientsRepository } from "./repositories/clients.repository";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../storage/storage.service";
import {
  ApiErrorCode,
  AuditAction,
  UserRoleCode,
} from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import {
  buildPaginationMeta,
  parsePagination,
} from "../../common/pagination";
import {
  CreateClientDto,
  ListClientsQueryDto,
  UpdateClientDto,
  UpdateClientLocationDto,
  ConfirmDocumentDto,
  UploadUrlRequestDto,
} from "./dto/clients.dto";
import { mapClientRow, parseNearParam } from "./domain/client.mapper";
import { ClientAccessContext, isAdminRole } from "./domain/client.types";
import { ClientDocument } from "./entities/client-document.entity";
import {
  formatPhoneWithCountryPrefix,
  isValidRouteCity,
  isValidRouteCountryCode,
  isValidRouteDepartment,
} from "../routes/domain/route-locations";
import { getCurrencyForCountry } from "../routes/domain/route-currencies";

@Injectable()
export class ClientsService {
  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
  ) {}

  private accessFromUser(user: JwtPayload): ClientAccessContext {
    return { userId: user.sub, role: user.role };
  }

  private async assertAccess(clientId: string, user: JwtPayload): Promise<void> {
    const allowed = await this.clientsRepository.canAccessClient(
      clientId,
      this.accessFromUser(user),
    );
    if (!allowed) {
      throw new ForbiddenException({
        code: ApiErrorCode.CLIENT_ACCESS_DENIED,
        message: "No tienes acceso a este cliente",
      });
    }
  }

  private assertAdmin(user: JwtPayload): void {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Solo administradores pueden realizar esta acción",
      });
    }
  }

  async list(user: JwtPayload, query: ListClientsQueryDto) {
    const { page, limit, skip } = parsePagination(query.page, query.limit);
    const near = parseNearParam(query.near);

    if (query.near && !near) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "El parámetro 'near' debe tener formato lat,lng",
      });
    }

    if (near && !query.radius_m) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "El parámetro 'radius_m' es requerido cuando usas 'near'",
      });
    }

    const { rows, total } = await this.clientsRepository.findPaginated(
      this.accessFromUser(user),
      {
        q: query.q,
        status: query.status,
        routeId: query.routeId,
        shift: query.shift,
        overdue: query.overdue,
        near,
        radiusM: query.radius_m,
      },
      page,
      limit,
      query.sort,
    );

    return {
      data: rows.map(mapClientRow),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getById(user: JwtPayload, clientId: string) {
    await this.assertAccess(clientId, user);
    const row = await this.clientsRepository.findById(clientId);
    if (!row) {
      throw new NotFoundException({
        code: ApiErrorCode.CLIENT_NOT_FOUND,
        message: "Cliente no encontrado",
      });
    }
    return mapClientRow(row);
  }

  private assertValidClientLocation(
    country: string,
    department: string,
    city: string,
  ): void {
    if (!isValidRouteCountryCode(country)) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "País no válido",
      });
    }
    if (!isValidRouteDepartment(country, department)) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Departamento no válido para el país seleccionado",
      });
    }
    if (!isValidRouteCity(country, department, city)) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Ciudad no válida para el departamento seleccionado",
      });
    }
  }

  private normalizePhone(
    phone: string | undefined,
    country: string,
  ): string | undefined {
    if (!phone?.trim()) {
      return undefined;
    }
    return formatPhoneWithCountryPrefix(country, phone);
  }

  async create(user: JwtPayload, dto: CreateClientDto, ipAddress?: string) {
    this.assertValidClientLocation(dto.country, dto.department, dto.city);

    const row = await this.clientsRepository.createClient({
      firstName: dto.firstName,
      lastName: dto.lastName,
      nationalId: dto.nationalId,
      phone: this.normalizePhone(dto.phone, dto.country),
      email: dto.email,
      addressLine: dto.addressLine,
      country: dto.country,
      department: dto.department,
      city: dto.city,
      location: dto.location,
      notes: dto.notes,
      createdById: user.sub,
    });

    const routeExists = await this.clientsRepository.routeExists(dto.routeId);
    if (!routeExists) {
      throw new NotFoundException({
        code: ApiErrorCode.ROUTE_NOT_FOUND,
        message: "Ruta no encontrada",
      });
    }

    await this.clientsRepository.assignClientToRoute(row.id, dto.routeId);

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.CREATE,
      entityType: "client",
      entityId: row.id,
      afterState: { code: row.code, status: row.status, routeId: dto.routeId },
      ipAddress: ipAddress ?? null,
    });

    return mapClientRow(row);
  }

  async update(
    user: JwtPayload,
    clientId: string,
    dto: UpdateClientDto,
    ipAddress?: string,
  ) {
    this.assertAdmin(user);

    const before = await this.clientsRepository.findById(clientId);
    if (!before) {
      throw new NotFoundException({
        code: ApiErrorCode.CLIENT_NOT_FOUND,
        message: "Cliente no encontrado",
      });
    }

    const country = dto.country ?? before.country;
    const department = dto.department ?? before.department;
    const city = dto.city ?? before.city;

    if (country && department && city) {
      this.assertValidClientLocation(country, department, city);
    }

    const patch: UpdateClientDto = { ...dto };
    if (dto.phone !== undefined && country) {
      patch.phone = this.normalizePhone(dto.phone ?? undefined, country) ?? null;
    }

    const row = await this.clientsRepository.updateClient(clientId, patch);
    if (!row) {
      throw new NotFoundException({
        code: ApiErrorCode.CLIENT_NOT_FOUND,
        message: "Cliente no encontrado",
      });
    }

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.UPDATE,
      entityType: "client",
      entityId: clientId,
      beforeState: { status: before.status, phone: before.phone },
      afterState: { status: row.status, phone: row.phone },
      ipAddress: ipAddress ?? null,
    });

    return mapClientRow(row);
  }

  async softDelete(user: JwtPayload, clientId: string, ipAddress?: string) {
    this.assertAdmin(user);

    const before = await this.clientsRepository.findById(clientId);
    if (!before) {
      throw new NotFoundException({
        code: ApiErrorCode.CLIENT_NOT_FOUND,
        message: "Cliente no encontrado",
      });
    }

    await this.clientsRepository.softDelete(clientId);

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.SOFT_DELETE,
      entityType: "client",
      entityId: clientId,
      beforeState: { code: before.code },
      ipAddress: ipAddress ?? null,
    });

    return { message: "Cliente eliminado correctamente" };
  }

  async updateLocation(
    user: JwtPayload,
    clientId: string,
    dto: UpdateClientLocationDto,
    ipAddress?: string,
  ) {
    await this.assertAccess(clientId, user);

    if (!isAdminRole(user.role)) {
      // Collectors can only update location, not other fields (enforced by separate endpoint)
    }

    const before = await this.clientsRepository.findById(clientId);
    if (!before) {
      throw new NotFoundException({
        code: ApiErrorCode.CLIENT_NOT_FOUND,
        message: "Cliente no encontrado",
      });
    }

    const source = user.role === UserRoleCode.ADMIN ? "admin" : "collector";
    const row = await this.clientsRepository.updateLocation(
      clientId,
      dto.location,
      {
        source,
        recordedById: user.sub,
        accuracyM: dto.accuracyM,
        deviceId: dto.deviceId,
      },
    );

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.UPDATE,
      entityType: "client",
      entityId: clientId,
      beforeState: {
        lat: before.lat,
        lng: before.lng,
      },
      afterState: {
        lat: row?.lat ?? null,
        lng: row?.lng ?? null,
      },
      metadata: { field: "location", source },
      ipAddress: ipAddress ?? null,
    });

    return mapClientRow(row!);
  }

  async getLocationHistory(user: JwtPayload, clientId: string) {
    await this.assertAccess(clientId, user);
    const history = await this.clientsRepository.getLocationHistory(clientId);
    return history.map((entry: Record<string, unknown>) => ({
      id: entry.id,
      location: {
        lat: Number(entry.lat),
        lng: Number(entry.lng),
      },
      accuracyM: entry.accuracy_m ? Number(entry.accuracy_m) : null,
      source: entry.source,
      recordedBy: entry.recorded_by,
      deviceId: entry.device_id,
      recordedAt: entry.recorded_at,
    }));
  }

  async createUploadUrl(
    user: JwtPayload,
    clientId: string,
    dto: UploadUrlRequestDto,
  ) {
    this.assertAdmin(user);
    await this.assertAccess(clientId, user);

    const storageKey = this.storageService.buildDocumentStorageKey(
      clientId,
      dto.fileName,
    );
    const { uploadUrl, expiresIn } = await this.storageService.getUploadUrl(
      storageKey,
      dto.mimeType,
    );

    return { uploadUrl, storageKey, expiresIn };
  }

  async confirmDocument(
    user: JwtPayload,
    clientId: string,
    dto: ConfirmDocumentDto,
    ipAddress?: string,
  ) {
    this.assertAdmin(user);
    await this.assertAccess(clientId, user);

    if (!this.storageService.isStorageKeyForClient(dto.storageKey, clientId)) {
      throw new BadRequestException({
        code: ApiErrorCode.STORAGE_KEY_MISMATCH,
        message: "La clave de almacenamiento no corresponde a este cliente",
      });
    }

    const doc = await this.clientsRepository.createDocument({
      clientId,
      documentType: dto.documentType,
      storageKey: dto.storageKey,
      mimeType: dto.mimeType,
      fileSizeBytes: dto.fileSizeBytes,
      uploadedById: user.sub,
    });

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.CREATE,
      entityType: "client_document",
      entityId: doc.id,
      afterState: {
        clientId,
        documentType: dto.documentType,
        mimeType: dto.mimeType,
      },
      ipAddress: ipAddress ?? null,
    });

    return {
      id: doc.id,
      documentType: doc.documentType,
      mimeType: doc.mimeType,
      fileSizeBytes: Number(doc.fileSizeBytes),
      createdAt: doc.createdAt,
    };
  }

  async listDocuments(user: JwtPayload, clientId: string) {
    await this.assertAccess(clientId, user);
    const docs = await this.clientsRepository.listDocuments(clientId);
    return docs
      .filter((d: ClientDocument) => !d.deletedAt)
      .map((doc: ClientDocument) => ({
        id: doc.id,
        documentType: doc.documentType,
        mimeType: doc.mimeType,
        fileSizeBytes: Number(doc.fileSizeBytes),
        createdAt: doc.createdAt,
      }));
  }

  async getDocumentDownloadUrl(
    user: JwtPayload,
    clientId: string,
    documentId: string,
    ipAddress?: string,
  ) {
    await this.assertAccess(clientId, user);

    const doc = await this.clientsRepository.findDocumentById(clientId, documentId);
    if (!doc || doc.deletedAt) {
      throw new NotFoundException({
        code: ApiErrorCode.DOCUMENT_NOT_FOUND,
        message: "Documento no encontrado",
      });
    }

    const { downloadUrl, expiresIn } = await this.storageService.getDownloadUrl(
      doc.storageKey,
    );

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.UPDATE,
      entityType: "client_document",
      entityId: doc.id,
      metadata: { action: "download_url_issued" },
      ipAddress: ipAddress ?? null,
    });

    return { downloadUrl, expiresIn };
  }

  async deleteDocument(
    user: JwtPayload,
    clientId: string,
    documentId: string,
    ipAddress?: string,
  ) {
    this.assertAdmin(user);
    await this.assertAccess(clientId, user);

    const doc = await this.clientsRepository.findDocumentById(clientId, documentId);
    if (!doc || doc.deletedAt) {
      throw new NotFoundException({
        code: ApiErrorCode.DOCUMENT_NOT_FOUND,
        message: "Documento no encontrado",
      });
    }

    await this.clientsRepository.softDeleteDocument(documentId);

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.SOFT_DELETE,
      entityType: "client_document",
      entityId: documentId,
      ipAddress: ipAddress ?? null,
    });

    return { message: "Documento eliminado correctamente" };
  }

  async getInstallments(user: JwtPayload, clientId: string) {
    await this.assertAccess(clientId, user);
    const rows = await this.clientsRepository.findInstallmentsByClient(clientId);
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      creditId: r.credit_id,
      installmentNumber: r.installment_number,
      dueDate: r.due_date,
      amountDue: Number(r.amount_due),
      amountPaid: Number(r.amount_paid),
      status: r.status,
      currency: r.currency,
    }));
  }

  async getPayments(user: JwtPayload, clientId: string) {
    await this.assertAccess(clientId, user);
    const rows = await this.clientsRepository.findPaymentsByClient(clientId);
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      amount: Number(r.amount),
      paymentMethod: r.payment_method,
      status: r.status,
      capturedAt: r.captured_at,
      recordedAt: r.recorded_at,
      currency: r.currency,
    }));
  }

  async getAssignedRoutes(user: JwtPayload, clientId: string) {
    await this.assertAccess(clientId, user);
    const rows = await this.clientsRepository.findAssignedRoutes(clientId);
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      country: r.country,
      department: r.department,
      city: r.city,
      sequenceOrder: r.sequence_order,
      currency:
        r.country && typeof r.country === "string"
          ? getCurrencyForCountry(r.country)
          : null,
    }));
  }
}
