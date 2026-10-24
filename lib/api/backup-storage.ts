import { uploadObject, downloadObject, deleteObject } from "@/lib/s3";

export async function uploadBackup(key: string, data: string): Promise<number> {
  const body = Buffer.from(data, "utf-8");
  await uploadObject(key, body, "application/json");
  return body.length;
}

export async function downloadBackup(key: string): Promise<string> {
  const result = await downloadObject(key);
  if (result.body instanceof Uint8Array || Buffer.isBuffer(result.body)) {
    return Buffer.from(result.body as unknown as ArrayBuffer).toString("utf-8");
  }
  if (result.body && typeof (result.body as { transformToString?: unknown }).transformToString === "function") {
    return (result.body as { transformToString: (encoding: string) => Promise<string> }).transformToString("utf-8");
  }
  return String(result.body);
}

export async function deleteBackupObject(key: string): Promise<void> {
  await deleteObject(key);
}
