import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Client } from "../entities/client.entity";
import { ClientDocument } from "../entities/client-document.entity";
import { ClientLocationHistory } from "../entities/client-location-history.entity";
import {
  ClientAccessContext,
  ClientListFilters,
  ClientRow,
  GeoPoint,
  isAdminRole,
  todayInTimezone,
} from "../domain/client.types";
import { ClientStatus, DocumentType } from "../../../common/constants";

@Injectable()
export class ClientsRepository {
  private readonly timezone: string;

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ClientDocument)
    private readonly documentRepository: Repository<ClientDocument>,
    @InjectRepository(ClientLocationHistory)
    private readonly locationHistoryRepository: Repository<ClientLocationHistory>,
    private readonly dataSource: DataSource,
    configService: ConfigService,
  ) {
    this.timezone = configService.get<string>("timezone", "America/Bogota");
  }

  private collectorScopeCondition(paramIndex: number): { sql: string; nextIndex: number } {
    return {
      sql: `c.id IN (
        SELECT DISTINCT rca.client_id
        FROM route_client_assignments rca
        INNER JOIN route_collector_assignments rco ON rca.route_id = rco.route_id
        WHERE rco.collector_id = $${paramIndex}
          AND $${paramIndex + 1}::date >= rco.effective_from
          AND (rco.effective_to IS NULL OR $${paramIndex + 1}::date <= rco.effective_to)
      )`,
      nextIndex: paramIndex + 2,
    };
  }

  async canAccessClient(
    clientId: string,
    access: ClientAccessContext,
  ): Promise<boolean> {
    if (isAdminRole(access.role)) {
      const row = await this.dataSource.query(
        `SELECT id FROM clients WHERE id = $1 AND deleted_at IS NULL`,
        [clientId],
      );
      return row.length > 0;
    }

    const today = todayInTimezone(this.timezone);
    const rows = await this.dataSource.query(
      `SELECT 1
       FROM route_client_assignments rca
       INNER JOIN route_collector_assignments rco ON rca.route_id = rco.route_id
       WHERE rca.client_id = $1
         AND rco.collector_id = $2
         AND $3::date >= rco.effective_from
         AND (rco.effective_to IS NULL OR $3::date <= rco.effective_to)
       LIMIT 1`,
      [clientId, access.userId, today],
    );
    return rows.length > 0;
  }

  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    const params: unknown[] = [code];
    let sql = `SELECT id FROM clients WHERE code = $1 AND deleted_at IS NULL`;
    if (excludeId) {
      sql += ` AND id != $2`;
      params.push(excludeId);
    }
    const rows = await this.dataSource.query(sql, params);
    return rows.length > 0;
  }

  async findPaginated(
    access: ClientAccessContext,
    filters: ClientListFilters,
    page: number,
    limit: number,
    sort = "-createdAt",
  ): Promise<{ rows: ClientRow[]; total: number }> {
    const conditions: string[] = ["c.deleted_at IS NULL"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (!isAdminRole(access.role)) {
      const scope = this.collectorScopeCondition(paramIndex);
      conditions.push(scope.sql);
      params.push(access.userId, todayInTimezone(this.timezone));
      paramIndex = scope.nextIndex;
    }

    if (filters.q) {
      conditions.push(`(
        c.first_name ILIKE $${paramIndex}
        OR c.last_name ILIKE $${paramIndex}
        OR c.code ILIKE $${paramIndex}
        OR c.phone ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.q}%`);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`c.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.routeId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM route_client_assignments rca
        WHERE rca.client_id = c.id AND rca.route_id = $${paramIndex++}
      )`);
      params.push(filters.routeId);
    }

    if (filters.shift) {
      conditions.push(`EXISTS (
        SELECT 1 FROM route_client_assignments rca
        INNER JOIN routes r ON r.id = rca.route_id
        WHERE rca.client_id = c.id AND r.shift = $${paramIndex++} AND r.deleted_at IS NULL
      )`);
      params.push(filters.shift);
    }

    if (filters.overdue) {
      conditions.push(`EXISTS (
        SELECT 1 FROM credits cr
        INNER JOIN installments i ON i.credit_id = cr.id
        WHERE cr.client_id = c.id
          AND cr.status = 'active'
          AND i.status IN ('overdue', 'partial')
          AND i.due_date < DATE '${todayInTimezone(this.timezone)}'
      )`);
    }

    if (filters.near && filters.radiusM) {
      conditions.push(`c.current_location IS NOT NULL AND ST_DWithin(
        c.current_location,
        ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography,
        $${paramIndex + 2}
      )`);
      params.push(filters.near.lng, filters.near.lat, filters.radiusM);
      paramIndex += 3;
    }

    const whereClause = conditions.join(" AND ");
    const orderClause = this.buildOrderClause(sort);

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM clients c WHERE ${whereClause}`,
      params,
    );
    const total = countResult[0]?.total ?? 0;

    const offset = (page - 1) * limit;
    const rows = await this.dataSource.query(
      `SELECT
        c.id,
        c.code,
        c.first_name,
        c.last_name,
        c.national_id,
        c.phone,
        c.email,
        c.address_line,
        c.country,
        c.department,
        c.city,
        ST_Y(c.current_location::geometry) AS lat,
        ST_X(c.current_location::geometry) AS lng,
        c.status,
        c.notes,
        c.created_by,
        c.created_at,
        c.updated_at,
        (
          SELECT COUNT(*)::text FROM credits cr
          WHERE cr.client_id = c.id AND cr.status = 'active'
        ) AS active_credits_count,
        (
          SELECT COUNT(*)::text FROM credits cr
          INNER JOIN installments i ON i.credit_id = cr.id
          WHERE cr.client_id = c.id
            AND cr.status = 'active'
            AND i.status IN ('overdue', 'partial', 'pending')
            AND i.due_date < DATE '${todayInTimezone(this.timezone)}'
        ) AS overdue_installments_count
      FROM clients c
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset],
    );

    return { rows, total };
  }

  private clientSelectSql = `
        c.id,
        c.code,
        c.first_name,
        c.last_name,
        c.national_id,
        c.phone,
        c.email,
        c.address_line,
        c.country,
        c.department,
        c.city,
        ST_Y(c.current_location::geometry) AS lat,
        ST_X(c.current_location::geometry) AS lng,
        c.status,
        c.notes,
        c.created_by,
        c.created_at,
        c.updated_at`;

  private async queryClientById(
    runner: Pick<DataSource, "query">,
    clientId: string,
  ): Promise<ClientRow | null> {
    const rows = await runner.query(
      `SELECT ${this.clientSelectSql}
      FROM clients c
      WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [clientId],
    );
    return rows[0] ?? null;
  }

  async findById(clientId: string): Promise<ClientRow | null> {
    return this.queryClientById(this.dataSource, clientId);
  }

  async createClient(data: {
    firstName: string;
    lastName: string;
    nationalId?: string;
    phone?: string;
    email?: string;
    addressLine?: string;
    country: string;
    department: string;
    city: string;
    location?: GeoPoint;
    notes?: string;
    createdById: string;
  }): Promise<ClientRow> {
    return this.dataSource.transaction(async (manager) => {
      const seqResult = await manager.query(
        `SELECT nextval('client_code_seq') AS seq`,
      );
      const seq = Number(seqResult[0]?.seq ?? 1);
      const code = `CLI-${String(seq).padStart(6, "0")}`;

      const params: unknown[] = [
        code,
        data.firstName,
        data.lastName,
        data.nationalId ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.addressLine ?? null,
        data.country,
        data.department,
        data.city,
        data.notes ?? null,
        data.createdById,
      ];

      let locationSql = "NULL";
      if (data.location) {
        locationSql = `ST_SetSRID(ST_MakePoint($13, $14), 4326)::geography`;
        params.push(data.location.lng, data.location.lat);
      }

      const rows = await manager.query(
        `INSERT INTO clients (
          code, first_name, last_name, national_id, phone, email,
          address_line, country, department, city, current_location, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ${locationSql}, $11, $12)
        RETURNING id`,
        params,
      );

      const created = await this.queryClientById(manager, rows[0].id as string);
      if (!created) {
        throw new Error("Failed to load created client");
      }
      return created;
    });
  }

  async updateClient(
    clientId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      nationalId: string | null;
      phone: string | null;
      email: string | null;
      addressLine: string | null;
      country: string | null;
      department: string | null;
      city: string | null;
      location: GeoPoint | null;
      status: ClientStatus;
      notes: string | null;
    }>,
  ): Promise<ClientRow | null> {
    const sets: string[] = ["updated_at = now()"];
    const params: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      firstName: "first_name",
      lastName: "last_name",
      nationalId: "national_id",
      phone: "phone",
      email: "email",
      addressLine: "address_line",
      country: "country",
      department: "department",
      city: "city",
      status: "status",
      notes: "notes",
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (key in data) {
        sets.push(`${column} = $${idx++}`);
        params.push((data as Record<string, unknown>)[key]);
      }
    }

    if ("location" in data) {
      if (data.location === null) {
        sets.push("current_location = NULL");
      } else if (data.location) {
        sets.push(
          `current_location = ST_SetSRID(ST_MakePoint($${idx}, $${idx + 1}), 4326)::geography`,
        );
        params.push(data.location.lng, data.location.lat);
        idx += 2;
      }
    }

    params.push(clientId);
    await this.dataSource.query(
      `UPDATE clients SET ${sets.join(", ")} WHERE id = $${idx} AND deleted_at IS NULL`,
      params,
    );

    return this.findById(clientId);
  }

  async softDelete(clientId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE clients SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL`,
      [clientId],
    );
  }

  async updateLocation(
    clientId: string,
    location: GeoPoint,
    meta: {
      source: string;
      recordedById: string;
      accuracyM?: number;
      deviceId?: string;
    },
  ): Promise<ClientRow | null> {
    await this.dataSource.query(
      `UPDATE clients
       SET current_location = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL`,
      [clientId, location.lng, location.lat],
    );

    await this.dataSource.query(
      `INSERT INTO client_location_history (
        client_id, location, accuracy_m, source, recorded_by, device_id
      ) VALUES (
        $1,
        ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
        $4, $5, $6, $7
      )`,
      [
        clientId,
        location.lng,
        location.lat,
        meta.accuracyM ?? null,
        meta.source,
        meta.recordedById,
        meta.deviceId ?? null,
      ],
    );

    return this.findById(clientId);
  }

  async getLocationHistory(clientId: string, limit = 50) {
    return this.dataSource.query(
      `SELECT
        id,
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng,
        accuracy_m,
        source,
        recorded_by,
        device_id,
        recorded_at
      FROM client_location_history
      WHERE client_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2`,
      [clientId, limit],
    );
  }

  async createDocument(data: {
    clientId: string;
    documentType: DocumentType;
    storageKey: string;
    mimeType: string;
    fileSizeBytes: number;
    uploadedById: string;
  }): Promise<ClientDocument> {
    const doc = this.documentRepository.create({
      clientId: data.clientId,
      documentType: data.documentType,
      storageKey: data.storageKey,
      mimeType: data.mimeType,
      fileSizeBytes: String(data.fileSizeBytes),
      uploadedById: data.uploadedById,
    });
    return this.documentRepository.save(doc);
  }

  async listDocuments(clientId: string): Promise<ClientDocument[]> {
    return this.documentRepository.find({
      where: { clientId },
      order: { createdAt: "DESC" },
    });
  }

  async findDocumentById(
    clientId: string,
    documentId: string,
  ): Promise<ClientDocument | null> {
    return this.documentRepository.findOne({
      where: { id: documentId, clientId },
      select: {
        id: true,
        clientId: true,
        documentType: true,
        storageKey: true,
        mimeType: true,
        fileSizeBytes: true,
        uploadedById: true,
        createdAt: true,
        deletedAt: true,
      },
    });
  }

  async softDeleteDocument(documentId: string): Promise<void> {
    await this.documentRepository.softDelete(documentId);
  }

  async routeExists(routeId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT id FROM routes WHERE id = $1 AND deleted_at IS NULL`,
      [routeId],
    );
    return rows.length > 0;
  }

  async assignClientToRoute(clientId: string, routeId: string): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO route_client_assignments (route_id, client_id, sequence_order)
       SELECT $1, $2, COALESCE(MAX(sequence_order), 0) + 1
       FROM route_client_assignments
       WHERE route_id = $1`,
      [routeId, clientId],
    );
  }

  async replaceClientRoutes(clientId: string, routeIds: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      if (routeIds.length === 0) {
        await manager.query(
          `DELETE FROM route_client_assignments WHERE client_id = $1`,
          [clientId],
        );
        return;
      }

      await manager.query(
        `DELETE FROM route_client_assignments
         WHERE client_id = $1
           AND route_id != ALL($2::uuid[])`,
        [clientId, routeIds],
      );

      for (const routeId of routeIds) {
        const existing = await manager.query(
          `SELECT 1 FROM route_client_assignments
           WHERE client_id = $1 AND route_id = $2`,
          [clientId, routeId],
        );
        if (existing.length === 0) {
          await manager.query(
            `INSERT INTO route_client_assignments (route_id, client_id, sequence_order)
             SELECT $1, $2, COALESCE(MAX(sequence_order), 0) + 1
             FROM route_client_assignments
             WHERE route_id = $1`,
            [routeId, clientId],
          );
        }
      }
    });
  }

  async findAssignedRoutes(clientId: string) {
    return this.dataSource.query(
      `SELECT
        r.id,
        r.name,
        r.country,
        r.department,
        r.city,
        rca.sequence_order
      FROM route_client_assignments rca
      INNER JOIN routes r ON r.id = rca.route_id
      WHERE rca.client_id = $1
        AND r.deleted_at IS NULL
      ORDER BY rca.sequence_order ASC, r.name ASC`,
      [clientId],
    );
  }

  async findInstallmentsByClient(clientId: string) {
    return this.dataSource.query(
      `SELECT
        i.id,
        i.installment_number,
        i.due_date,
        i.amount_due,
        i.amount_paid,
        i.status,
        c.id AS credit_id,
        c.currency
       FROM installments i
       INNER JOIN credits c ON c.id = i.credit_id
       WHERE c.client_id = $1 AND c.status = 'active'
       ORDER BY i.due_date ASC`,
      [clientId],
    );
  }

  async findPaymentsByClient(clientId: string) {
    return this.dataSource.query(
      `SELECT
        p.id,
        p.amount,
        p.payment_method,
        p.status,
        p.captured_at,
        p.recorded_at,
        COALESCE(
          (
            SELECT cr.currency
            FROM payment_allocations pa
            INNER JOIN installments i ON i.id = pa.installment_id
            INNER JOIN credits cr ON cr.id = i.credit_id
            WHERE pa.payment_id = p.id
            LIMIT 1
          ),
          'COP'
        ) AS currency
       FROM payments p
       WHERE p.client_id = $1
       ORDER BY p.recorded_at DESC
       LIMIT 50`,
      [clientId],
    );
  }

  private buildOrderClause(sort: string): string {
    const desc = sort.startsWith("-");
    const field = desc ? sort.slice(1) : sort;
    const columnMap: Record<string, string> = {
      createdAt: "c.created_at",
      lastName: "c.last_name",
      code: "c.code",
    };
    const column = columnMap[field] ?? "c.created_at";
    return `${column} ${desc ? "DESC" : "ASC"}`;
  }
}
