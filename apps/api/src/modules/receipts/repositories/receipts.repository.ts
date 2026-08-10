import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Receipt } from "../entities/receipt.entity";
import { ReceiptLink } from "../entities/receipt-link.entity";

export interface ReceiptDetailRow {
  id: string;
  payment_id: string;
  receipt_number: string;
  storage_key: string;
  generated_at: Date;
  created_at: Date;
  client_id: string;
  collector_id: string;
  amount: string | number;
  payment_method: string;
  captured_at: Date;
  payment_status: string;
  client_first_name: string;
  client_last_name: string;
  collector_first_name: string;
  collector_last_name: string;
}

export interface ReceiptAllocationRow {
  installment_number: number;
  amount: string | number;
}

export interface ReceiptLinkRow {
  id: string;
  receipt_id: string;
  public_token: string;
  expires_at: Date;
  is_revoked: boolean;
  revoked_at: Date | null;
  access_count: number;
  last_accessed_at: Date | null;
  created_at: Date;
}

@Injectable()
export class ReceiptsRepository {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(ReceiptLink)
    private readonly receiptLinkRepository: Repository<ReceiptLink>,
    private readonly dataSource: DataSource,
  ) {}

  async findDetailById(receiptId: string): Promise<ReceiptDetailRow | null> {
    const rows = await this.dataSource.query(
      `SELECT
        r.id,
        r.payment_id,
        r.receipt_number,
        r.storage_key,
        r.generated_at,
        r.created_at,
        p.client_id,
        p.collector_id,
        p.amount,
        p.payment_method,
        p.captured_at,
        p.status AS payment_status,
        cl.first_name AS client_first_name,
        cl.last_name AS client_last_name,
        u.first_name AS collector_first_name,
        u.last_name AS collector_last_name
      FROM receipts r
      INNER JOIN payments p ON p.id = r.payment_id
      INNER JOIN clients cl ON cl.id = p.client_id
      INNER JOIN users u ON u.id = p.collector_id
      WHERE r.id = $1`,
      [receiptId],
    );
    return (rows[0] as ReceiptDetailRow | undefined) ?? null;
  }

  async findDetailByToken(publicToken: string): Promise<
    (ReceiptDetailRow & {
      link_id: string;
      link_expires_at: Date;
      link_is_revoked: boolean;
    }) | null
  > {
    const rows = await this.dataSource.query(
      `SELECT
        r.id,
        r.payment_id,
        r.receipt_number,
        r.storage_key,
        r.generated_at,
        r.created_at,
        p.client_id,
        p.collector_id,
        p.amount,
        p.payment_method,
        p.captured_at,
        p.status AS payment_status,
        cl.first_name AS client_first_name,
        cl.last_name AS client_last_name,
        u.first_name AS collector_first_name,
        u.last_name AS collector_last_name,
        rl.id AS link_id,
        rl.expires_at AS link_expires_at,
        rl.is_revoked AS link_is_revoked
      FROM receipt_links rl
      INNER JOIN receipts r ON r.id = rl.receipt_id
      INNER JOIN payments p ON p.id = r.payment_id
      INNER JOIN clients cl ON cl.id = p.client_id
      INNER JOIN users u ON u.id = p.collector_id
      WHERE rl.public_token = $1`,
      [publicToken],
    );
    return rows[0] ?? null;
  }

  async findAllocations(receiptId: string): Promise<ReceiptAllocationRow[]> {
    const rows = await this.dataSource.query(
      `SELECT i.installment_number, pa.amount
       FROM payment_allocations pa
       INNER JOIN installments i ON i.id = pa.installment_id
       INNER JOIN receipts r ON r.payment_id = pa.payment_id
       WHERE r.id = $1
       ORDER BY i.installment_number ASC`,
      [receiptId],
    );
    return rows as ReceiptAllocationRow[];
  }

  async listLinks(receiptId: string): Promise<ReceiptLinkRow[]> {
    const rows = await this.dataSource.query(
      `SELECT
        id,
        receipt_id,
        public_token,
        expires_at,
        is_revoked,
        revoked_at,
        access_count,
        last_accessed_at,
        created_at
       FROM receipt_links
       WHERE receipt_id = $1
       ORDER BY created_at DESC`,
      [receiptId],
    );
    return rows as ReceiptLinkRow[];
  }

  async findLinkById(
    receiptId: string,
    linkId: string,
  ): Promise<ReceiptLinkRow | null> {
    const rows = await this.dataSource.query(
      `SELECT
        id,
        receipt_id,
        public_token,
        expires_at,
        is_revoked,
        revoked_at,
        access_count,
        last_accessed_at,
        created_at
       FROM receipt_links
       WHERE id = $1 AND receipt_id = $2`,
      [linkId, receiptId],
    );
    return (rows[0] as ReceiptLinkRow | undefined) ?? null;
  }

  async createLink(input: {
    receiptId: string;
    publicToken: string;
    expiresAt: Date;
    createdById: string;
  }): Promise<ReceiptLinkRow> {
    const rows = await this.dataSource.query(
      `INSERT INTO receipt_links (
        receipt_id, public_token, expires_at, created_by
      ) VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        receipt_id,
        public_token,
        expires_at,
        is_revoked,
        revoked_at,
        access_count,
        last_accessed_at,
        created_at`,
      [
        input.receiptId,
        input.publicToken,
        input.expiresAt.toISOString(),
        input.createdById,
      ],
    );
    return rows[0] as ReceiptLinkRow;
  }

  async revokeLink(
    receiptId: string,
    linkId: string,
    revokedById: string,
  ): Promise<ReceiptLinkRow | null> {
    const rows = await this.dataSource.query(
      `UPDATE receipt_links
       SET is_revoked = true,
           revoked_at = now(),
           revoked_by = $3
       WHERE id = $1 AND receipt_id = $2 AND is_revoked = false
       RETURNING
        id,
        receipt_id,
        public_token,
        expires_at,
        is_revoked,
        revoked_at,
        access_count,
        last_accessed_at,
        created_at`,
      [linkId, receiptId, revokedById],
    );
    return (rows[0] as ReceiptLinkRow | undefined) ?? null;
  }

  async markLinkAccessed(linkId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE receipt_links
       SET access_count = access_count + 1,
           last_accessed_at = now()
       WHERE id = $1`,
      [linkId],
    );
  }

  async updateStorageKey(receiptId: string, storageKey: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE receipts
       SET storage_key = $2,
           generated_at = now()
       WHERE id = $1`,
      [receiptId, storageKey],
    );
  }

  async lockReceiptForGeneration(receiptId: string): Promise<ReceiptDetailRow | null> {
    const rows = await this.dataSource.query(
      `SELECT
        r.id,
        r.payment_id,
        r.receipt_number,
        r.storage_key,
        r.generated_at,
        r.created_at,
        p.client_id,
        p.collector_id,
        p.amount,
        p.payment_method,
        p.captured_at,
        p.status AS payment_status,
        cl.first_name AS client_first_name,
        cl.last_name AS client_last_name,
        u.first_name AS collector_first_name,
        u.last_name AS collector_last_name
      FROM receipts r
      INNER JOIN payments p ON p.id = r.payment_id
      INNER JOIN clients cl ON cl.id = p.client_id
      INNER JOIN users u ON u.id = p.collector_id
      WHERE r.id = $1
      FOR UPDATE OF r`,
      [receiptId],
    );
    return (rows[0] as ReceiptDetailRow | undefined) ?? null;
  }
}
