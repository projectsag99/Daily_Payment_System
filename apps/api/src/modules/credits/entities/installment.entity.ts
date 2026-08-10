import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { InstallmentStatus } from "../../../common/constants";
import { Credit } from "./credit.entity";

@Entity("installments")
export class Installment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "credit_id", type: "uuid" })
  creditId!: string;

  @ManyToOne(() => Credit, { onDelete: "CASCADE" })
  @JoinColumn({ name: "credit_id" })
  credit!: Credit;

  @Column({ name: "installment_number", type: "int" })
  installmentNumber!: number;

  @Column({ name: "due_date", type: "date" })
  dueDate!: string;

  @Column({ name: "amount_due", type: "decimal", precision: 15, scale: 2 })
  amountDue!: string;

  @Column({ name: "amount_paid", type: "decimal", precision: 15, scale: 2, default: 0 })
  amountPaid!: string;

  @Column({
    type: "enum",
    enum: InstallmentStatus,
    enumName: "installment_status",
    default: InstallmentStatus.PENDING,
  })
  status!: InstallmentStatus;

  @Column({ name: "overdue_at", type: "timestamptz", nullable: true })
  overdueAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
