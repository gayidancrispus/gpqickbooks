import { test } from "node:test";
import assert from "node:assert/strict";
import { uploadObject, downloadObject, deleteObject } from "../lib/s3";

test("uploadObject stores file and downloadObject retrieves it", async () => {
  const testKey = `test/ugx-doc-${Date.now()}.txt`;
  const content = Buffer.from("UGX document content 🇺🇬");

  await uploadObject(testKey, content, "text/plain");

  const result = await downloadObject(testKey);
  assert.ok(result.body, "Should return body");

  let bodyBuffer: Buffer;
  if (Buffer.isBuffer(result.body)) {
    bodyBuffer = result.body;
  } else if (result.body instanceof Uint8Array) {
    bodyBuffer = Buffer.from(result.body);
  } else if (
    result.body &&
    typeof (result.body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray ===
      "function"
  ) {
    const bytes = await (
      result.body as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
    bodyBuffer = Buffer.from(bytes);
  } else {
    bodyBuffer = Buffer.from(result.body as Uint8Array);
  }

  assert.equal(bodyBuffer.toString("utf-8"), "UGX document content 🇺🇬");

  // Cleanup
  await deleteObject(testKey);
});
