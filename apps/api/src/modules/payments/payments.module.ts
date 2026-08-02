import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment } from "./entities/payment.entity";
import { PaymentAllocation } from "./entities/payment-allocation.entity";
import { IdempotencyKeyRecord } from "./entities/idempotency-key.entity";
import { PaymentsRepository } from "./repositories/payments.repository";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { ClientsModule } from "../clients/clients.module";
import { RulesModule } from "../rules/rules.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentAllocation, IdempotencyKeyRecord]),
    ClientsModule,
    RulesModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsRepository, PaymentsService],
  exports: [PaymentsRepository, PaymentsService],
})
export class PaymentsModule {}
