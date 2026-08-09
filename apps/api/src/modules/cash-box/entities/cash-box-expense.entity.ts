import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Route } from "../../routes/entities/route.entity";

@Entity("cash_box_expenses")
export class CashBoxExpense {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "collector_id", type: "uuid" })
  collectorId!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "collector_id" })
  collector!: User;

  @Column({ name: "expense_date", type: "date" })
  expenseDate!: string;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 500 })
  description!: string;

  @Column({ name: "created_by", type: "uuid" })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "created_by" })
  createdBy!: User;

  @Column({ name: "route_id", type: "uuid", nullable: true })
  routeId!: string | null;

  @Column({
    type: "enum",
    enum: ["route", "office"],
    enumName: "cash_box_expense_category",
    default: "office",
  })
  category!: "route" | "office";

  @ManyToOne(() => Route, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "route_id" })
  route!: Route | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
