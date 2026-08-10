import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NonWorkingDay } from "../entities/non-working-day.entity";

@Injectable()
export class BusinessCalendarRepository {
  constructor(
    @InjectRepository(NonWorkingDay)
    private readonly repository: Repository<NonWorkingDay>,
  ) {}

  async listInRange(from: string, to: string): Promise<NonWorkingDay[]> {
    return this.repository
      .createQueryBuilder("d")
      .where("d.day_date >= :from AND d.day_date <= :to", { from, to })
      .orderBy("d.day_date", "ASC")
      .getMany();
  }

  async create(input: {
    dayDate: string;
    label: string;
    createdBy: string;
  }): Promise<NonWorkingDay> {
    const row = this.repository.create(input);
    return this.repository.save(row);
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
