import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

@Entity("cash_box_initial_balances")
export class CashBoxInitialBalance {
  @PrimaryColumn({ name: "collector_id", type: "uuid" })
  collectorId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "collector_id" })
  collector!: User;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  notes!: string | null;

  @Column({ name: "set_by", type: "uuid" })
  setById!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "set_by" })
  setBy!: User;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
