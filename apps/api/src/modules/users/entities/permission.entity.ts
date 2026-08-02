import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from "typeorm";
import { Role } from "./role.entity";

@Entity("permissions")
export class Permission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  code!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
