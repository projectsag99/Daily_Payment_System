import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Receipt } from "./receipt.entity";
import { User } from "../../users/entities/user.entity";

@Entity("receipt_links")
export class ReceiptLink {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "receipt_id", type: "uuid" })
  receiptId!: string;

  @ManyToOne(() => Receipt, { onDelete: "CASCADE" })
  @JoinColumn({ name: "receipt_id" })
  receipt!: Receipt;

  @Column({ name: "public_token", type: "varchar", length: 128, unique: true })
  publicToken!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "is_revoked", type: "boolean", default: false })
  isRevoked!: boolean;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @Column({ name: "revoked_by", type: "uuid", nullable: true })
  revokedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "revoked_by" })
  revokedBy!: User | null;

  @Column({ name: "access_count", type: "int", default: 0 })
  accessCount!: number;

  @Column({ name: "last_accessed_at", type: "timestamptz", nullable: true })
  lastAccessedAt!: Date | null;

  @Column({ name: "created_by", type: "uuid" })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "created_by" })
  createdBy!: User;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
