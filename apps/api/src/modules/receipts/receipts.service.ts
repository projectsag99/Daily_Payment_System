import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  GoneException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import {
  ReceiptsRepository,
  ReceiptDetailRow,
  ReceiptLinkRow,
} from "./repositories/receipts.repository";
import { ClientsRepository } from "../clients/repositories/clients.repository";
import { StorageService } from "../storage/storage.service";
import { AuditService } from "../audit/audit.service";
import {
  addDaysFromNow,
  buildReceiptPublicUrl,
  generateReceiptPublicToken,
  isLinkExpired,
} from "./domain/receipt-token";
import { buildReceiptPublicView } from "./domain/receipt-public-view";
import { buildReceiptPdf } from "./domain/receipt-pdf.builder";
import { CreateReceiptLinkDto } from "./dto/receipts.dto";
import {
  ApiErrorCode,
  AuditAction,
  PaymentStatus,
} from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { isAdminRole } from "../clients/domain/client.types";

@Injectable()
export class ReceiptsService {
  private readonly linkTtlDays: number;
  private readonly webPublicBaseUrl: string;

  constructor(
    private readonly receiptsRepository: ReceiptsRepository,
    private readonly clientsRepository: ClientsRepository,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.linkTtlDays = this.configService.get<number>("receiptLinkTtlDays", 90);
    this.webPublicBaseUrl = this.configService.get<string>(
      "webPublicBaseUrl",
      "http://localhost:3000",
    );
  }

  async getById(user: JwtPayload, receiptId: string) {
    const receipt = await this.getAccessibleReceipt(user, receiptId);
    await this.ensureGenerated(receipt, user.sub);

    const refreshed = await this.receiptsRepository.findDetailById(receiptId);
    if (!refreshed) {
      throw new NotFoundException({
        code: ApiErrorCode.RECEIPT_NOT_FOUND,
        message: "Recibo no encontrado",
      });
    }

    return this.mapReceiptMetadata(refreshed);
  }

  async getDownloadUrl(user: JwtPayload, receiptId: string) {
    const receipt = await this.getAccessibleReceipt(user, receiptId);
    await this.ensureGenerated(receipt, user.sub);

    const refreshed = await this.receiptsRepository.findDetailById(receiptId);
    if (!refreshed) {
      throw new NotFoundException({
        code: ApiErrorCode.RECEIPT_NOT_FOUND,
        message: "Recibo no encontrado",
      });
    }

    if (this.storageService.isPendingReceiptKey(refreshed.storage_key)) {
      throw new BadRequestException({
        code: ApiErrorCode.RECEIPT_NOT_READY,
        message: "El recibo aún se está generando",
      });
    }

    const { downloadUrl, expiresIn } = await this.storageService.getDownloadUrl(
      refreshed.storage_key,
    );

    return { downloadUrl, expiresIn };
  }

  async createLink(
    user: JwtPayload,
    receiptId: string,
    dto: CreateReceiptLinkDto,
  ) {
    const receipt = await this.getAccessibleReceipt(user, receiptId);
    await this.ensureGenerated(receipt, user.sub);

    const expiresInDays = Math.min(
      dto.expiresInDays ?? this.linkTtlDays,
      this.linkTtlDays,
    );
    const publicToken = generateReceiptPublicToken();
    const expiresAt = addDaysFromNow(expiresInDays);

    const link = await this.receiptsRepository.createLink({
      receiptId,
      publicToken,
      expiresAt,
      createdById: user.sub,
    });

    return this.mapLink(link);
  }

  async listLinks(user: JwtPayload, receiptId: string) {
    await this.getAccessibleReceipt(user, receiptId);
    const links = await this.receiptsRepository.listLinks(receiptId);
    return links.map((link) => this.mapLinkSummary(link));
  }

  async revokeLink(
    user: JwtPayload,
    receiptId: string,
    linkId: string,
    ipAddress?: string,
  ) {
    await this.getAccessibleReceipt(user, receiptId);

    const revoked = await this.receiptsRepository.revokeLink(
      receiptId,
      linkId,
      user.sub,
    );
    if (!revoked) {
      throw new NotFoundException({
        code: ApiErrorCode.RECEIPT_LINK_NOT_FOUND,
        message: "Enlace de recibo no encontrado",
      });
    }

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.RECEIPT_LINK_REVOKE,
      entityType: "receipt_link",
      entityId: linkId,
      afterState: {
        receiptId,
        publicToken: revoked.public_token,
      },
      ipAddress: ipAddress ?? null,
    });

    return this.mapLinkSummary(revoked);
  }

  async getPublicByToken(publicToken: string) {
    const row = await this.receiptsRepository.findDetailByToken(publicToken);
    if (!row) {
      throw new NotFoundException({
        code: ApiErrorCode.RECEIPT_NOT_FOUND,
        message: "Recibo no encontrado",
      });
    }

    if (row.link_is_revoked) {
      throw new GoneException({
        code: ApiErrorCode.RECEIPT_LINK_REVOKED,
        message: "Este enlace de recibo fue revocado",
      });
    }

    if (isLinkExpired(new Date(row.link_expires_at))) {
      throw new GoneException({
        code: ApiErrorCode.RECEIPT_LINK_EXPIRED,
        message: "Este enlace de recibo expiró",
      });
    }

    if (row.payment_status !== PaymentStatus.COMPLETED) {
      throw new NotFoundException({
        code: ApiErrorCode.RECEIPT_NOT_FOUND,
        message: "Recibo no encontrado",
      });
    }

    await this.ensureGenerated(row, null);
    await this.receiptsRepository.markLinkAccessed(row.link_id);

    return buildReceiptPublicView({
      receiptNumber: row.receipt_number,
      capturedAt: row.captured_at,
      amount: Number(row.amount),
      collectorFirstName: row.collector_first_name,
      clientFirstName: row.client_first_name,
      paymentMethod: row.payment_method,
    });
  }

  private async getAccessibleReceipt(
    user: JwtPayload,
    receiptId: string,
  ): Promise<ReceiptDetailRow> {
    const receipt = await this.receiptsRepository.findDetailById(receiptId);
    if (!receipt) {
      throw new NotFoundException({
        code: ApiErrorCode.RECEIPT_NOT_FOUND,
        message: "Recibo no encontrado",
      });
    }

    if (receipt.payment_status !== PaymentStatus.COMPLETED) {
      throw new NotFoundException({
        code: ApiErrorCode.RECEIPT_NOT_FOUND,
        message: "Recibo no encontrado",
      });
    }

    if (!isAdminRole(user.role)) {
      const allowed = await this.clientsRepository.canAccessClient(
        receipt.client_id,
        { userId: user.sub, role: user.role },
      );
      if (!allowed || receipt.collector_id !== user.sub) {
        throw new ForbiddenException({
          code: ApiErrorCode.FORBIDDEN,
          message: "No tienes acceso a este recibo",
        });
      }
    }

    return receipt;
  }

  private async ensureGenerated(
    receipt: ReceiptDetailRow,
    actorId: string | null,
  ): Promise<void> {
    if (!this.storageService.isPendingReceiptKey(receipt.storage_key)) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.query(
        `SELECT storage_key FROM receipts WHERE id = $1 FOR UPDATE`,
        [receipt.id],
      );
      const currentKey = locked[0]?.storage_key as string | undefined;
      if (!currentKey || !this.storageService.isPendingReceiptKey(currentKey)) {
        return;
      }

      const detailRows = await manager.query(
        `SELECT
          r.id,
          r.receipt_number,
          p.amount,
          p.payment_method,
          p.captured_at,
          cl.first_name AS client_first_name,
          cl.last_name AS client_last_name,
          u.first_name AS collector_first_name,
          u.last_name AS collector_last_name
         FROM receipts r
         INNER JOIN payments p ON p.id = r.payment_id
         INNER JOIN clients cl ON cl.id = p.client_id
         INNER JOIN users u ON u.id = p.collector_id
         WHERE r.id = $1`,
        [receipt.id],
      );
      const detail = detailRows[0] as
        | {
            id: string;
            receipt_number: string;
            amount: string | number;
            payment_method: string;
            captured_at: Date;
            client_first_name: string;
            client_last_name: string;
            collector_first_name: string;
            collector_last_name: string;
          }
        | undefined;

      if (!detail) {
        return;
      }

      const allocationRows = await manager.query(
        `SELECT i.installment_number, pa.amount
         FROM payment_allocations pa
         INNER JOIN installments i ON i.id = pa.installment_id
         INNER JOIN receipts r ON r.payment_id = pa.payment_id
         WHERE r.id = $1
         ORDER BY i.installment_number ASC`,
        [receipt.id],
      );

      const pdfBuffer = await buildReceiptPdf({
        receiptNumber: detail.receipt_number,
        capturedAt: detail.captured_at,
        amount: Number(detail.amount),
        paymentMethod: detail.payment_method,
        clientFullName: `${detail.client_first_name} ${detail.client_last_name}`.trim(),
        collectorFullName:
          `${detail.collector_first_name} ${detail.collector_last_name}`.trim(),
        allocations: (allocationRows as Array<{
          installment_number: number;
          amount: string | number;
        }>).map((row) => ({
          installmentNumber: Number(row.installment_number),
          amount: Number(row.amount),
        })),
      });

      const storageKey = this.storageService.buildReceiptStorageKey(receipt.id);
      await this.storageService.putObject(storageKey, pdfBuffer, "application/pdf");

      await manager.query(
        `UPDATE receipts
         SET storage_key = $2, generated_at = now()
         WHERE id = $1`,
        [receipt.id, storageKey],
      );

      await manager.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_state)
         VALUES ($1, 'RECEIPT_GENERATE', 'receipt', $2, $3)`,
        [actorId, receipt.id, JSON.stringify({ storageKey })],
      );
    });
  }

  private mapReceiptMetadata(receipt: ReceiptDetailRow) {
    const isPending = this.storageService.isPendingReceiptKey(receipt.storage_key);
    return {
      id: receipt.id,
      paymentId: receipt.payment_id,
      receiptNumber: receipt.receipt_number,
      generatedAt: receipt.generated_at,
      status: isPending ? "generating" : "ready",
      downloadAvailable: !isPending,
    };
  }

  private mapLink(link: ReceiptLinkRow) {
    return {
      id: link.id,
      publicUrl: buildReceiptPublicUrl(this.webPublicBaseUrl, link.public_token),
      expiresAt: link.expires_at,
      isRevoked: link.is_revoked,
    };
  }

  private mapLinkSummary(link: ReceiptLinkRow) {
    return {
      id: link.id,
      publicUrl: buildReceiptPublicUrl(this.webPublicBaseUrl, link.public_token),
      expiresAt: link.expires_at,
      isRevoked: link.is_revoked,
      revokedAt: link.revoked_at,
      accessCount: link.access_count,
      lastAccessedAt: link.last_accessed_at,
      createdAt: link.created_at,
    };
  }
}
