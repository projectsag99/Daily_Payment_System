import { Injectable } from "@nestjs/common";
import { BusinessCalendarRepository } from "./repositories/business-calendar.repository";

@Injectable()
export class BusinessCalendarService {
  constructor(
    private readonly businessCalendarRepository: BusinessCalendarRepository,
  ) {}

  list(from: string, to: string) {
    return this.businessCalendarRepository.listInRange(from, to);
  }

  create(dayDate: string, label: string, createdBy: string) {
    return this.businessCalendarRepository.create({
      dayDate,
      label,
      createdBy,
    });
  }

  remove(id: string) {
    return this.businessCalendarRepository.deleteById(id);
  }
}
