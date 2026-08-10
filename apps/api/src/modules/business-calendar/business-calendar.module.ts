import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NonWorkingDay } from "./entities/non-working-day.entity";
import { BusinessCalendarController } from "./business-calendar.controller";
import { BusinessCalendarService } from "./business-calendar.service";
import { BusinessCalendarRepository } from "./repositories/business-calendar.repository";

@Module({
  imports: [TypeOrmModule.forFeature([NonWorkingDay])],
  controllers: [BusinessCalendarController],
  providers: [BusinessCalendarService, BusinessCalendarRepository],
  exports: [BusinessCalendarRepository],
})
export class BusinessCalendarModule {}
