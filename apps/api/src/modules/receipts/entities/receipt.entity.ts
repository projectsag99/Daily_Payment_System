import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { Payment } from "../../payments/entities/payment.entity";

@Entity("receipts")
export class Receipt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "payment_id", type: "uuid", unique: true })
  paymentId!: string;

  @OneToOne(() => Payment, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "payment_id" })
  payment!: Payment;

  @Column({ name: "receipt_number", type: "varchar", length: 50, unique: true })
  receiptNumber!: string;

  @Column({ name: "storage_key", type: "varchar", length: 500 })
  storageKey!: string;

  @Column({ name: "generated_at", type: "timestamptz" })
  generatedAt!: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
