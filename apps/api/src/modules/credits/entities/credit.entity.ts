import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CreditStatus } from "../../../common/constants";
import { Client } from "../../clients/entities/client.entity";
import { Route } from "../../routes/entities/route.entity";
import { User } from "../../users/entities/user.entity";

@Entity("credits")
export class Credit {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "client_id", type: "uuid" })
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "client_id" })
  client!: Client;

  @Column({ name: "route_id", type: "uuid", nullable: true })
  routeId!: string | null;

  @ManyToOne(() => Route, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "route_id" })
  route!: Route | null;

  @Column({ type: "char", length: 3 })
  currency!: string;

  @Column({ name: "principal_amount", type: "decimal", precision: 15, scale: 2 })
  principalAmount!: string;

  @Column({ name: "interest_rate", type: "decimal", precision: 8, scale: 4, nullable: true })
  interestRate!: string | null;

  @Column({ name: "total_installments", type: "int" })
  totalInstallments!: number;

  @Column({ name: "installment_amount", type: "decimal", precision: 15, scale: 2 })
  installmentAmount!: string;

  @Column({ name: "start_date", type: "date" })
  startDate!: string;

  @Column({
    type: "enum",
    enum: CreditStatus,
    enumName: "credit_status",
    default: CreditStatus.ACTIVE,
  })
  status!: CreditStatus;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by" })
  createdBy!: User | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "closed_at", type: "timestamptz", nullable: true })
  closedAt!: Date | null;
}
