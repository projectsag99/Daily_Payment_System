import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { GlobalExceptionFilter } from "../src/common/filters/global-exception.filter";

describe("Security (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 401 for protected routes without token", async () => {
    await request(app.getHttpServer()).get("/v1/clients").expect(401);
    await request(app.getHttpServer()).get("/v1/payments").expect(401);
    await request(app.getHttpServer()).get("/v1/audit").expect(401);
  });

  it("allows public health and receipt routes without token", async () => {
    await request(app.getHttpServer()).get("/v1/health").expect(200);
    await request(app.getHttpServer())
      .get("/v1/public/receipts/nonexistent-token")
      .expect(404);
  });
});
