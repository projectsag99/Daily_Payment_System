export default () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 3001),
  timezone: process.env.APP_TIMEZONE ?? "America/Bogota",
  database: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://dps:dps@localhost:5432/daily_payment",
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
    accessTtlMinutes: Number(process.env.JWT_ACCESS_TTL_MINUTES ?? 15),
    refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? 7),
  },
  corsOrigins: process.env.CORS_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000",
  storage: {
    endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
    accessKey: process.env.S3_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.S3_SECRET_KEY ?? "minioadmin",
    bucket: process.env.S3_BUCKET ?? "daily-payment",
    region: process.env.S3_REGION ?? "us-east-1",
    uploadUrlTtlSeconds: Number(process.env.S3_UPLOAD_URL_TTL_SECONDS ?? 300),
    downloadUrlTtlSeconds: Number(process.env.S3_DOWNLOAD_URL_TTL_SECONDS ?? 60),
  },
  receiptLinkTtlDays: Number(process.env.RECEIPT_LINK_TTL_DAYS ?? 90),
  webPublicBaseUrl: process.env.WEB_PUBLIC_URL ?? "http://localhost:3000",
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY,
  },
});
