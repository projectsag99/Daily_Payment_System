import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CashBoxExpense } from "./entities/cash-box-expense.entity";
import { CashBoxExpenseReceipt } from "./entities/cash-box-expense-receipt.entity";
import { CashBoxInitialBalance } from "./entities/cash-box-initial-balance.entity";
import { CashBoxRepository } from "./repositories/cash-box.repository";
import { CashBoxService } from "./cash-box.service";
import { CashBoxController } from "./cash-box.controller";
import { RoutesModule } from "../routes/routes.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CashBoxExpense,
      CashBoxExpenseReceipt,
      CashBoxInitialBalance,
    ]),
    RoutesModule,
    StorageModule,
  ],
  controllers: [CashBoxController],
  providers: [CashBoxRepository, CashBoxService],
  exports: [CashBoxService],
})
export class CashBoxModule {}
