import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";

export enum SyncEventStatus {
  SUCCESS = "success",
  CONFLICT = "conflict",
  ERROR = "error",
  ALREADY_APPLIED = "already_applied",
}

@Entity("sync_events")
export class SyncEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "device_id", type: "varchar", length: 100 })
  deviceId!: string;

  @Column({ name: "client_event_id", type: "varchar", length: 100 })
  clientEventId!: string;

  @Column({ name: "event_type", type: "varchar", length: 50 })
  eventType!: string;

  @Column({ name: "payload_hash", type: "varchar", length: 64 })
  payloadHash!: string;

  @Column({
    type: "enum",
    enum: SyncEventStatus,
    enumName: "sync_event_status",
  })
  status!: SyncEventStatus;

  @Column({ name: "result_entity_id", type: "uuid", nullable: true })
  resultEntityId!: string | null;

  @Column({ name: "error_code", type: "varchar", length: 100, nullable: true })
  errorCode!: string | null;

  @Column({ name: "processed_at", type: "timestamptz" })
  processedAt!: Date;
}
