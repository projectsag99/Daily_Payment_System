import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Payment } from "./payment.entity";
import { Installment } from "../../credits/entities/installment.entity";

@Entity("payment_allocations")
export class PaymentAllocation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "payment_id", type: "uuid" })
  paymentId!: string;

  @ManyToOne(() => Payment, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "payment_id" })
  payment!: Payment;

  @Column({ name: "installment_id", type: "uuid" })
  installmentId!: string;

  @ManyToOne(() => Installment, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "installment_id" })
  installment!: Installment;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
