import { getAuthContext } from "@/lib/api/auth-context";
import { notFound, handleError } from "@/lib/api/response";
import { downloadObject } from "@/lib/s3";

function inferMimeType(fileName: string, fallback?: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "svg": return "image/svg+xml";
    default: return fallback || "application/octet-stream";
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const fileKey = url.searchParams.get("fileKey");
    if (!fileKey) return notFound("File");

    await getAuthContext(request);

    const { body, contentType } = await downloadObject(fileKey);
    const fileName = fileKey.split("/").pop() || "receipt";
    const resolvedMime = inferMimeType(fileName, contentType);

    const headers = new Headers();
    headers.set("Content-Type", resolvedMime);
    headers.set(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(fileName)}"`
    );
    headers.set("Cache-Control", "private, max-age=3600");

    if (body instanceof Uint8Array || Buffer.isBuffer(body)) {
      return new Response(body as unknown as BodyInit, { headers });
    }

    if (body && typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function") {
      const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
      return new Response(Buffer.from(bytes) as unknown as BodyInit, { headers });
    }

    if (body && typeof (body as unknown as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function") {
      const chunks: Buffer[] = [];
      for await (const chunk of body as AsyncIterable<Uint8Array | Buffer>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return new Response(Buffer.concat(chunks) as unknown as BodyInit, { headers });
    }

    return new Response(body as unknown as BodyInit, { headers });
  } catch (err) {
    return handleError(err);
  }
}
