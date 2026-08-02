import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import configuration from "../config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        url: config.get<string>("database.url"),
        autoLoadEntities: true,
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: false,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
