import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { UserRoleCode } from "../../../common/constants";
import { User } from "./user.entity";
import { Permission } from "./permission.entity";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "enum", enum: UserRoleCode, enumName: "user_role_code" })
  code!: UserRoleCode;

  @Column({ type: "varchar", length: 50 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @ManyToMany(() => User, (user) => user.roles)
  users!: User[];

  @ManyToMany(() => Permission, (permission) => permission.roles, { eager: true })
  @JoinTable({
    name: "role_permissions",
    joinColumn: { name: "role_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permission_id", referencedColumnName: "id" },
  })
  permissions!: Permission[];
}
