import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CashBoxExpense } from "./cash-box-expense.entity";

@Entity("cash_box_expense_receipts")
export class CashBoxExpenseReceipt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "expense_id", type: "uuid" })
  expenseId!: string;

  @ManyToOne(() => CashBoxExpense, { onDelete: "CASCADE" })
  @JoinColumn({ name: "expense_id" })
  expense!: CashBoxExpense;

  @Column({ name: "storage_key", type: "varchar", length: 500 })
  storageKey!: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType!: string;

  @Column({ name: "original_file_name", type: "varchar", length: 255, nullable: true })
  originalFileName!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
