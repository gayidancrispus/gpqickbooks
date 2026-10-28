import { db } from "@/lib/db";
import { document } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/api/auth-context";
import { notDeleted } from "@/lib/db/soft-delete";
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

    const doc = await db.query.document.findFirst({
      where: and(
        eq(document.id, id),
        notDeleted(document.deletedAt)
      ),
    });

    if (!doc) return notFound("Document");

    // Authenticate user against the document's organization
    const ctx = await getAuthContext(request, doc.organizationId);

    if (doc.visibility === "private" && doc.uploadedBy !== ctx.userId) {
      return notFound("Document");
    }

    const { body, contentType } = await downloadObject(doc.fileKey);
    const url = new URL(request.url);
    const isDownload = url.searchParams.get("download") === "1";

    const resolvedMime = inferMimeType(doc.fileName, contentType || doc.mimeType);

    const headers = new Headers();
    headers.set("Content-Type", resolvedMime);
    headers.set(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(doc.fileName)}"`
    );
    headers.set("Cache-Control", "private, max-age=3600");

    if (body instanceof Uint8Array || Buffer.isBuffer(body)) {
      return new Response(body as unknown as BodyInit, { headers });
    }

    // Body could have transformToByteArray (e.g. from AWS SDK v3)
    if (body && typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function") {
      const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
      return new Response(Buffer.from(bytes) as unknown as BodyInit, { headers });
    }

    // Body could be an async iterable stream
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
