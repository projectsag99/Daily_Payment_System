import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { VisitStatus } from "../../../common/constants";
import { Route } from "./route.entity";
import { Client } from "../../clients/entities/client.entity";

@Entity("route_client_assignments")
export class RouteClientAssignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "route_id", type: "uuid" })
  routeId!: string;

  @ManyToOne(() => Route, { onDelete: "CASCADE" })
  @JoinColumn({ name: "route_id" })
  route!: Route;

  @Column({ name: "client_id", type: "uuid" })
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: "CASCADE" })
  @JoinColumn({ name: "client_id" })
  client!: Client;

  @Column({ name: "sequence_order", type: "int" })
  sequenceOrder!: number;

  @Column({
    name: "visit_status",
    type: "enum",
    enum: VisitStatus,
    enumName: "visit_status",
    default: VisitStatus.PENDING,
  })
  visitStatus!: VisitStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
