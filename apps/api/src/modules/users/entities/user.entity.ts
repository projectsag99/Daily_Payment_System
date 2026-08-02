import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
  OneToOne,
} from "typeorm";
import { Role } from "./role.entity";
import { CollectorProfile } from "../../collectors/entities/collector-profile.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ name: "first_name", type: "varchar", length: 100 })
  firstName!: string;

  @Column({ name: "last_name", type: "varchar", length: 100 })
  lastName!: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone!: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "email_verified_at", type: "timestamptz", nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: "user_roles",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles!: Role[];

  @OneToOne(() => CollectorProfile, (profile) => profile.user)
  collectorProfile!: CollectorProfile | null;
}
