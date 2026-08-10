import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { SyncEvent, SyncEventStatus } from "../entities/sync-event.entity";

export interface SyncEventRow {
  id: string;
  device_id: string;
  client_event_id: string;
  event_type: string;
  payload_hash: string;
  status: SyncEventStatus;
  result_entity_id: string | null;
  error_code: string | null;
  processed_at: Date;
}

@Injectable()
export class SyncRepository {
  constructor(
    @InjectRepository(SyncEvent)
    private readonly syncEventRepository: Repository<SyncEvent>,
    private readonly dataSource: DataSource,
  ) {}

  async findByDeviceEvent(
    deviceId: string,
    clientEventId: string,
  ): Promise<SyncEventRow | null> {
    const rows = await this.dataSource.query(
      `SELECT *
       FROM sync_events
       WHERE device_id = $1 AND client_event_id = $2`,
      [deviceId, clientEventId],
    );
    return (rows[0] as SyncEventRow | undefined) ?? null;
  }

  async insertEvent(input: {
    deviceId: string;
    clientEventId: string;
    eventType: string;
    payloadHash: string;
    status: SyncEventStatus;
    resultEntityId?: string | null;
    errorCode?: string | null;
  }): Promise<SyncEventRow | null> {
    try {
      const rows = await this.dataSource.query(
        `INSERT INTO sync_events (
          device_id, client_event_id, event_type, payload_hash,
          status, result_entity_id, error_code, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
        RETURNING *`,
        [
          input.deviceId,
          input.clientEventId,
          input.eventType,
          input.payloadHash,
          input.status,
          input.resultEntityId ?? null,
          input.errorCode ?? null,
        ],
      );
      return rows[0] as SyncEventRow;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        return null;
      }
      throw error;
    }
  }

  async countRecentEvents(deviceId: string, hours = 24): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count
       FROM sync_events
       WHERE device_id = $1
         AND processed_at > now() - ($2::text || ' hours')::interval`,
      [deviceId, String(hours)],
    );
    return Number(rows[0]?.count ?? 0);
  }
}
