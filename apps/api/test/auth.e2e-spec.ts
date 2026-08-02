import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { GlobalExceptionFilter } from "../src/common/filters/global-exception.filter";

describe("Auth & Collectors (e2e)", () => {
  let app: INestApplication;

  const collector = {
    email: `collector-${Date.now()}@test.com`,
    password: "SecurePass123!",
    firstName: "Juan",
    lastName: "Pérez",
    phone: "+573001234567",
  };

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

  it("registers a collector in pending status", async () => {
    const response = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send(collector)
      .expect(201);

    expect(response.body.collectorStatus).toBe("pending");
    expect(response.body.role).toBe("collector");
  });

  it("allows pending collector to login", async () => {
    const response = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({ email: collector.email, password: collector.password })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.user.collectorStatus).toBe("pending");
  });

  it("blocks pending collector from active-only dashboard", async () => {
    const login = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({ email: collector.email, password: collector.password });

    await request(app.getHttpServer())
      .get("/v1/dashboard/collector")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(403);
  });
});
