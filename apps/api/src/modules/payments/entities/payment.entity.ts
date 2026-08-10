import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { PaymentStatus, PaymentMethod } from "../../../common/constants";
import { Client } from "../../clients/entities/client.entity";
import { User } from "../../users/entities/user.entity";

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "client_id", type: "uuid" })
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "client_id" })
  client!: Client;

  @Column({ name: "collector_id", type: "uuid" })
  collectorId!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "collector_id" })
  collector!: User;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount!: string;

  @Column({ name: "payment_method", type: "enum", enum: PaymentMethod, enumName: "payment_method" })
  paymentMethod!: PaymentMethod;

  @Column({ type: "enum", enum: PaymentStatus, enumName: "payment_status", default: PaymentStatus.COMPLETED })
  status!: PaymentStatus;

  @Column({ name: "idempotency_key", type: "varchar", length: 100 })
  idempotencyKey!: string;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ name: "captured_at", type: "timestamptz" })
  capturedAt!: Date;

  @Column({ name: "recorded_at", type: "timestamptz", default: () => "now()" })
  recordedAt!: Date;

  @Column({ name: "device_id", type: "varchar", length: 100, nullable: true })
  deviceId!: string | null;

  @Column({
    name: "geo_location",
    type: "geography",
    spatialFeatureType: "Point",
    srid: 4326,
    nullable: true,
    select: false,
  })
  geoLocation!: string | null;

  @Column({ name: "reversed_at", type: "timestamptz", nullable: true })
  reversedAt!: Date | null;

  @Column({ name: "reversed_by", type: "uuid", nullable: true })
  reversedById!: string | null;

  @Column({ name: "reversal_reason", type: "text", nullable: true })
  reversalReason!: string | null;
}
