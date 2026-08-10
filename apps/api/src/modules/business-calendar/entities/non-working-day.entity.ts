import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("non_working_days")
export class NonWorkingDay {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "day_date", type: "date", unique: true })
  dayDate!: string;

  @Column({ type: "varchar", length: 200 })
  label!: string;

  @Column({ name: "created_by", type: "uuid" })
  createdBy!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
