import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { DocumentType } from "../../../common/constants";
import { Client } from "./client.entity";
import { User } from "../../users/entities/user.entity";

@Entity("client_documents")
export class ClientDocument {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "client_id", type: "uuid" })
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: "CASCADE" })
  @JoinColumn({ name: "client_id" })
  client!: Client;

  @Column({ name: "document_type", type: "enum", enum: DocumentType, enumName: "document_type" })
  documentType!: DocumentType;

  @Column({ name: "storage_key", type: "varchar", length: 500, select: false })
  storageKey!: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType!: string;

  @Column({ name: "file_size_bytes", type: "bigint" })
  fileSizeBytes!: string;

  @Column({ name: "uploaded_by", type: "uuid", nullable: true })
  uploadedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "uploaded_by" })
  uploadedBy!: User | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
