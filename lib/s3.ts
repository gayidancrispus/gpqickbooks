import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "node:fs/promises";
import path from "node:path";

const s3Region = process.env.S3_REGION || "us-east-1";
const s3Endpoint = process.env.S3_ENDPOINT || undefined;
const s3AccessKey = process.env.S3_ACCESS_KEY_ID;
const s3SecretKey = process.env.S3_SECRET_ACCESS_KEY;
export const bucket = process.env.S3_BUCKET || "dubbl";

export const s3 = new S3Client({
  region: s3Region,
  endpoint: s3Endpoint,
  credentials:
    s3AccessKey && s3SecretKey
      ? {
          accessKeyId: s3AccessKey,
          secretAccessKey: s3SecretKey,
        }
      : {
          accessKeyId: "dummy",
          secretAccessKey: "dummy",
        },
  forcePathStyle: true,
});

let bucketEnsured = false;

export async function ensureBucket(): Promise<boolean> {
  if (bucketEnsured) return true;
  if (!s3AccessKey && !s3Endpoint) return false;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    bucketEnsured = true;
    return true;
  } catch (err: unknown) {
    const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (
      error?.name === "NotFound" ||
      error?.$metadata?.httpStatusCode === 404 ||
      error?.name === "NoSuchBucket"
    ) {
      try {
        await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        bucketEnsured = true;
        return true;
      } catch {
        // Ignored if bucket cannot be auto-created
      }
    }
    return false;
  }
}

const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".storage", bucket);

async function saveLocalFile(key: string, body: Buffer | Uint8Array) {
  try {
    const fullPath = path.join(LOCAL_STORAGE_DIR, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, body);
  } catch {
    // Non-filesystem environments (pure edge) will skip local write
  }
}

async function getLocalFile(key: string): Promise<Buffer | null> {
  try {
    const fullPath = path.join(LOCAL_STORAGE_DIR, key);
    return await fs.readFile(fullPath);
  } catch {
    return null;
  }
}

async function deleteLocalFile(key: string) {
  try {
    const fullPath = path.join(LOCAL_STORAGE_DIR, key);
    await fs.unlink(fullPath);
  } catch {
    // Ignore error if file doesn't exist locally
  }
}

export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  let s3Success = false;
  if (s3AccessKey && s3SecretKey) {
    try {
      await ensureBucket();
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
      s3Success = true;
    } catch {
      // S3 failure falls back to local storage
    }
  }

  if (!s3Success) {
    await saveLocalFile(key, body);
  }
}

export async function downloadObject(
  key: string
): Promise<{ body: unknown; contentType?: string }> {
  if (s3AccessKey && s3SecretKey) {
    try {
      const res = await s3.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      return {
        body: res.Body,
        contentType: res.ContentType,
      };
    } catch {
      // Fall through to local fallback
    }
  }

  const local = await getLocalFile(key);
  if (local) {
    return { body: local };
  }
  throw new Error(`File not found: ${key}`);
}

export async function getUploadUrl(key: string, contentType: string) {
  if (s3AccessKey && s3SecretKey && s3Endpoint && !s3Endpoint.includes("localhost")) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(s3, command, { expiresIn: 3600 });
  }
  return `/api/v1/documents/direct-upload?key=${encodeURIComponent(key)}`;
}

export async function getDownloadUrl(key: string, expiresIn = 300) {
  if (s3AccessKey && s3SecretKey && s3Endpoint && !s3Endpoint.includes("localhost")) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return getSignedUrl(s3, command, { expiresIn });
  }
  return null;
}

export async function deleteObject(key: string) {
  if (s3AccessKey && s3SecretKey) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      await s3.send(command);
    } catch {
      // Ignore S3 delete failure
    }
  }
  await deleteLocalFile(key);
}
