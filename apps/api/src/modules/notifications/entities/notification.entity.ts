import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import {
  NotificationChannel,
  NotificationStatus,
} from "../../../common/constants";
import { User } from "../../users/entities/user.entity";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({
    type: "enum",
    enum: NotificationChannel,
    enumName: "notification_channel",
  })
  channel!: NotificationChannel;

  @Column({
    type: "enum",
    enum: NotificationStatus,
    enumName: "notification_status",
  })
  status!: NotificationStatus;

  @Column({ type: "jsonb", nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ name: "sent_at", type: "timestamptz", nullable: true })
  sentAt!: Date | null;

  @Column({ name: "read_at", type: "timestamptz", nullable: true })
  readAt!: Date | null;

  @Column({ name: "failure_reason", type: "text", nullable: true })
  failureReason!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
