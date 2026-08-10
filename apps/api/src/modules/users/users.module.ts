import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Role } from "./entities/role.entity";
import { Permission } from "./entities/permission.entity";
import { UsersRepository } from "./repositories/users.repository";

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission])],
  providers: [UsersRepository],
  exports: [UsersRepository, TypeOrmModule],
})
export class UsersModule {}
