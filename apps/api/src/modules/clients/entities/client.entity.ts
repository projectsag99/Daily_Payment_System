import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ClientStatus } from "../../../common/constants";
import { User } from "../../users/entities/user.entity";

@Entity("clients")
export class Client {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50 })
  code!: string;

  @Column({ name: "first_name", type: "varchar", length: 100 })
  firstName!: string;

  @Column({ name: "last_name", type: "varchar", length: 100 })
  lastName!: string;

  @Column({ name: "national_id", type: "varchar", length: 50, nullable: true })
  nationalId!: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email!: string | null;

  @Column({ name: "address_line", type: "text", nullable: true })
  addressLine!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city!: string | null;

  // Stored via raw SQL / repository — TypeORM geography mapping is handled in queries
  @Column({
    name: "current_location",
    type: "geography",
    spatialFeatureType: "Point",
    srid: 4326,
    nullable: true,
    select: false,
  })
  currentLocation!: string | null;

  @Column({
    type: "enum",
    enum: ClientStatus,
    enumName: "client_status",
    default: ClientStatus.ACTIVE,
  })
  status!: ClientStatus;

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

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
