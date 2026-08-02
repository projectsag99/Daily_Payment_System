import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import Redis from "ioredis";

export interface HealthCheckResult {
  status: "ok" | "degraded" | "error";
  checks: {
    database: "up" | "down";
    redis: "up" | "down";
    storage: "up" | "down";
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async readiness(): Promise<HealthCheckResult> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);

    const checks = { database, redis, storage };
    const allUp = Object.values(checks).every((value) => value === "up");
    const allDown = Object.values(checks).every((value) => value === "down");

    return {
      status: allUp ? "ok" : allDown ? "error" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<"up" | "down"> {
    try {
      await this.dataSource.query("SELECT 1");
      return "up";
    } catch {
      return "down";
    }
  }

  private async checkRedis(): Promise<"up" | "down"> {
    const url = this.configService.get<string>(
      "redis.url",
      "redis://localhost:6379",
    );
    const client = new Redis(url, {
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    try {
      await client.connect();
      const pong = await client.ping();
      return pong === "PONG" ? "up" : "down";
    } catch {
      return "down";
    } finally {
      client.disconnect();
    }
  }

  private async checkStorage(): Promise<"up" | "down"> {
    const endpoint = this.configService.get<string>("storage.endpoint");
    const bucket = this.configService.get<string>("storage.bucket");
    const accessKey = this.configService.get<string>("storage.accessKey");
    const secretKey = this.configService.get<string>("storage.secretKey");
    const region = this.configService.get<string>("storage.region", "us-east-1");

    if (!endpoint || !bucket || !accessKey || !secretKey) {
      return "down";
    }

    const client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return "up";
    } catch {
      return "down";
    }
  }
}
