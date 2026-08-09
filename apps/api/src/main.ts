import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { initSentry } from "./common/sentry/sentry";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { RequestIdInterceptor } from "./common/interceptors/request-id.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { MetricsInterceptor } from "./common/interceptors/metrics.interceptor";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: "25mb" }));
  app.use(urlencoded({ extended: true, limit: "25mb" }));
  const configService = app.get(ConfigService);
  initSentry({
    dsn: configService.get<string>("sentry.dsn"),
    environment: configService.get<string>("nodeEnv"),
  });

  app.use(helmet());
  // Single /v1 prefix — do not combine with URI versioning (would produce /v1/v1/...).
  app.setGlobalPrefix("v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    app.get(LoggingInterceptor),
    app.get(MetricsInterceptor),
  );

  const corsOrigins = configService
    .get<string>("corsOrigins", "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });

  if (process.env.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Daily Payment Collection System API")
      .setDescription("REST API v1")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
