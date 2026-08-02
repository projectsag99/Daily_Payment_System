import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";
import { Role } from "../entities/role.entity";
import { UserRoleCode } from "../../../common/constants";

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: { roles: { permissions: true }, collectorProfile: true },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: { roles: { permissions: true }, collectorProfile: true },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.userRepository
      .createQueryBuilder("user")
      .where("LOWER(user.email) = LOWER(:email)", { email })
      .andWhere("user.deleted_at IS NULL")
      .getCount();
    return count > 0;
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<User> {
    const user = this.userRepository.create({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
    });
    return this.userRepository.save(user);
  }

  async assignRole(userId: string, roleCode: UserRoleCode): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { roles: true },
    });
    if (!user) {
      return;
    }

    const role = await this.roleRepository.findOne({ where: { code: roleCode } });
    if (!role) {
      throw new Error(`Role ${roleCode} not found — run migrations seed`);
    }

    user.roles = [...(user.roles ?? []), role];
    await this.userRepository.save(user);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.userRepository.update(userId, { passwordHash });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }

  save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }
}
