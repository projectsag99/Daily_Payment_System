import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

@Entity("idempotency_keys")
export class IdempotencyKeyRecord {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  key!: string;

  @Column({ type: "varchar", length: 50 })
  scope!: string;

  @Column({ name: "actor_id", type: "uuid" })
  actorId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "actor_id" })
  actor!: User;

  @Column({ name: "request_hash", type: "varchar", length: 64 })
  requestHash!: string;

  @Column({ name: "response_status", type: "int" })
  responseStatus!: number;

  @Column({ name: "response_body", type: "jsonb" })
  responseBody!: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;
}
