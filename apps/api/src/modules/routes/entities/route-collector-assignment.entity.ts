import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Route } from "./route.entity";
import { User } from "../../users/entities/user.entity";

@Entity("route_collector_assignments")
export class RouteCollectorAssignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "route_id", type: "uuid" })
  routeId!: string;

  @ManyToOne(() => Route, { onDelete: "CASCADE" })
  @JoinColumn({ name: "route_id" })
  route!: Route;

  @Column({ name: "collector_id", type: "uuid" })
  collectorId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "collector_id" })
  collector!: User;

  @Column({ name: "effective_from", type: "date" })
  effectiveFrom!: string;

  @Column({ name: "effective_to", type: "date", nullable: true })
  effectiveTo!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
