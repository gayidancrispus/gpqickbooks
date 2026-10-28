import { db } from "@/lib/db";
import { attachment } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/api/auth-context";
import { notFound, handleError } from "@/lib/api/response";
import { downloadObject } from "@/lib/s3";

function inferMimeType(fileName: string, fallback?: string | null): string {
  if (fallback && fallback !== "application/octet-stream") return fallback;
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "svg": return "image/svg+xml";
    case "csv": return "text/csv";
    case "txt": return "text/plain";
    case "json": return "application/json";
    default: return fallback || "application/octet-stream";
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const att = await db.query.attachment.findFirst({
      where: eq(attachment.id, id),
    });

    if (!att) return notFound("Attachment");

    // Authenticate user against the attachment's organization
    await getAuthContext(request, att.organizationId);

    const { body, contentType } = await downloadObject(att.fileKey);
    const url = new URL(request.url);
    const isDownload = url.searchParams.get("download") === "1";

    const resolvedMime = inferMimeType(att.fileName, contentType || att.mimeType);

    const headers = new Headers();
    headers.set("Content-Type", resolvedMime);
    headers.set(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(att.fileName)}"`
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
