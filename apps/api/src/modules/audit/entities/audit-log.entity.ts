import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { AuditAction } from "../../../common/constants";
import { User } from "../../users/entities/user.entity";

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "actor_id", type: "uuid", nullable: true })
  actorId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "actor_id" })
  actor!: User | null;

  @Column({ type: "enum", enum: AuditAction, enumName: "audit_action" })
  action!: AuditAction;

  @Column({ name: "entity_type", type: "varchar", length: 50 })
  entityType!: string;

  @Column({ name: "entity_id", type: "uuid" })
  entityId!: string;

  @Column({ name: "before_state", type: "jsonb", nullable: true })
  beforeState!: Record<string, unknown> | null;

  @Column({ name: "after_state", type: "jsonb", nullable: true })
  afterState!: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: "ip_address", type: "inet", nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
