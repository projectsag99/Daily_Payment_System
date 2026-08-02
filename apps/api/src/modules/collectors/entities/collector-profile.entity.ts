import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { CollectorStatus } from "../../../common/constants";
import { User } from "../../users/entities/user.entity";

@Entity("collector_profiles")
export class CollectorProfile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid", unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.collectorProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({
    type: "enum",
    enum: CollectorStatus,
    enumName: "collector_status",
    default: CollectorStatus.PENDING,
  })
  status!: CollectorStatus;

  @Column({ name: "employee_code", type: "varchar", length: 50, nullable: true, unique: true })
  employeeCode!: string | null;

  @Column({ name: "status_changed_at", type: "timestamptz", nullable: true })
  statusChangedAt!: Date | null;

  @Column({ name: "status_changed_by", type: "uuid", nullable: true })
  statusChangedBy!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "status_changed_by" })
  statusChangedByUser!: User | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason!: string | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
