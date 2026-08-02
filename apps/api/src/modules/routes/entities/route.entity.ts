import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from "typeorm";
import { ShiftType } from "../../../common/constants";

@Entity("routes")
export class Route {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "enum", enum: ShiftType, enumName: "shift_type" })
  shift!: ShiftType;

  @Column({ name: "day_of_week", type: "smallint", nullable: true })
  dayOfWeek!: number | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
