import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Client } from "./client.entity";
import { User } from "../../users/entities/user.entity";

@Entity("client_location_history")
export class ClientLocationHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "client_id", type: "uuid" })
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: "CASCADE" })
  @JoinColumn({ name: "client_id" })
  client!: Client;

  @Column({
    type: "geography",
    spatialFeatureType: "Point",
    srid: 4326,
    select: false,
  })
  location!: string;

  @Column({ name: "accuracy_m", type: "decimal", precision: 10, scale: 2, nullable: true })
  accuracyM!: string | null;

  @Column({ type: "varchar", length: 50 })
  source!: string;

  @Column({ name: "recorded_by", type: "uuid", nullable: true })
  recordedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "recorded_by" })
  recordedBy!: User | null;

  @Column({ name: "device_id", type: "varchar", length: 100, nullable: true })
  deviceId!: string | null;

  @CreateDateColumn({ name: "recorded_at", type: "timestamptz" })
  recordedAt!: Date;
}
