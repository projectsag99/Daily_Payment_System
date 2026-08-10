import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CollectorProfile } from "../entities/collector-profile.entity";
import { CollectorStatus } from "../../../common/constants";

@Injectable()
export class CollectorsRepository {
  constructor(
    @InjectRepository(CollectorProfile)
    private readonly profileRepository: Repository<CollectorProfile>,
  ) {}

  createForUser(userId: string): Promise<CollectorProfile> {
    const profile = this.profileRepository.create({
      userId,
      status: CollectorStatus.PENDING,
    });
    return this.profileRepository.save(profile);
  }

  findByUserId(userId: string): Promise<CollectorProfile | null> {
    return this.profileRepository.findOne({
      where: { userId },
      relations: { user: { roles: { permissions: true } } },
    });
  }

  findById(id: string): Promise<CollectorProfile | null> {
    return this.profileRepository.findOne({
      where: { id },
      relations: { user: { roles: { permissions: true } } },
    });
  }

  findAll(status?: CollectorStatus): Promise<CollectorProfile[]> {
    const qb = this.profileRepository
      .createQueryBuilder("profile")
      .leftJoinAndSelect("profile.user", "user")
      .leftJoinAndSelect("user.roles", "roles");

    if (status) {
      qb.andWhere("profile.status = :status", { status });
    }

    return qb.orderBy("profile.created_at", "DESC").getMany();
  }

  findAssignable(): Promise<CollectorProfile[]> {
    return this.profileRepository
      .createQueryBuilder("profile")
      .leftJoinAndSelect("profile.user", "user")
      .leftJoinAndSelect("user.roles", "roles")
      .where("profile.status IN (:...statuses)", {
        statuses: [CollectorStatus.ACTIVE, CollectorStatus.PENDING],
      })
      .orderBy("profile.status", "ASC")
      .addOrderBy("profile.created_at", "DESC")
      .getMany();
  }

  save(profile: CollectorProfile): Promise<CollectorProfile> {
    return this.profileRepository.save(profile);
  }
}
