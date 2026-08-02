import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import {
  NotificationChannel,
  RuleType,
} from "../../../common/constants";
import { User } from "../../users/entities/user.entity";

@Entity("business_rules")
export class BusinessRule {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ name: "rule_type", type: "enum", enum: RuleType, enumName: "rule_type" })
  ruleType!: RuleType;

  @Column({ type: "jsonb" })
  config!: Record<string, unknown>;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({
    name: "notify_channel",
    type: "enum",
    enum: NotificationChannel,
    enumName: "notification_channel",
  })
  notifyChannel!: NotificationChannel;

  @Column({ name: "cooldown_hours", type: "int", default: 24 })
  cooldownHours!: number;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by" })
  createdBy!: User | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
