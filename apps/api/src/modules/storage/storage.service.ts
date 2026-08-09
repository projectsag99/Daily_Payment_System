import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly uploadTtl: number;
  private readonly downloadTtl: number;
  private readonly publicEndpoint: string | null;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>("storage.endpoint")!;
    this.publicEndpoint =
      this.configService.get<string>("storage.publicEndpoint")?.trim() || null;
    this.bucket = this.configService.get<string>("storage.bucket")!;
    this.uploadTtl = this.configService.get<number>("storage.uploadUrlTtlSeconds", 300);
    this.downloadTtl = this.configService.get<number>("storage.downloadUrlTtlSeconds", 60);

    this.client = new S3Client({
      region: this.configService.get<string>("storage.region", "us-east-1"),
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get<string>("storage.accessKey")!,
        secretAccessKey: this.configService.get<string>("storage.secretKey")!,
      },
    });
  }

  private withPublicEndpoint(signedUrl: string): string {
    if (!this.publicEndpoint) {
      return signedUrl;
    }
    const signed = new URL(signedUrl);
    const pub = new URL(this.publicEndpoint);
    signed.protocol = pub.protocol;
    signed.host = pub.host;
    return signed.toString();
  }

  buildDocumentStorageKey(clientId: string, fileName: string): string {
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
    return `documents/${clientId}/${uuidv4()}.${ext}`;
  }

  buildReceiptStorageKey(receiptId: string): string {
    return `receipts/${receiptId}.pdf`;
  }

  buildExpenseReceiptStorageKey(expenseId: string, fileName: string): string {
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
    return `cash-box-expenses/${expenseId}/${uuidv4()}.${ext}`;
  }

  isStorageKeyForExpense(storageKey: string, expenseId: string): boolean {
    return storageKey.startsWith(`cash-box-expenses/${expenseId}/`);
  }

  isPendingReceiptKey(storageKey: string): boolean {
    return storageKey.startsWith("pending/");
  }

  async putObject(
    storageKey: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getUploadUrl(
    storageKey: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; expiresIn: number }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: mimeType,
    });
    const uploadUrl = this.withPublicEndpoint(
      await getSignedUrl(this.client, command, {
        expiresIn: this.uploadTtl,
      }),
    );
    return { uploadUrl, expiresIn: this.uploadTtl };
  }

  async getDownloadUrl(storageKey: string): Promise<{ downloadUrl: string; expiresIn: number }> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });
    const downloadUrl = this.withPublicEndpoint(
      await getSignedUrl(this.client, command, {
        expiresIn: this.downloadTtl,
      }),
    );
    return { downloadUrl, expiresIn: this.downloadTtl };
  }

  async getObjectStream(
    storageKey: string,
  ): Promise<{ body: Readable; contentType: string }> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );
    if (!response.Body) {
      throw new Error("STORAGE_OBJECT_EMPTY");
    }
    return {
      body: response.Body as Readable,
      contentType: response.ContentType ?? "application/octet-stream",
    };
  }

  isStorageKeyForClient(storageKey: string, clientId: string): boolean {
    return storageKey.startsWith(`documents/${clientId}/`);
  }
}
