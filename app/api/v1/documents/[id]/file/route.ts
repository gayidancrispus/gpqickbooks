import { db } from "@/lib/db";
import { document } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/api/auth-context";
import { notDeleted } from "@/lib/db/soft-delete";
import { notFound, handleError } from "@/lib/api/response";
import { downloadObject } from "@/lib/s3";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(request);

    const doc = await db.query.document.findFirst({
      where: and(
        eq(document.id, id),
        eq(document.organizationId, ctx.organizationId),
        notDeleted(document.deletedAt)
      ),
    });

    if (!doc) return notFound("Document");
    if (doc.visibility === "private" && doc.uploadedBy !== ctx.userId) {
      return notFound("Document");
    }

    const { body, contentType } = await downloadObject(doc.fileKey);
    const url = new URL(request.url);
    const isDownload = url.searchParams.get("download") === "1";

    const headers = new Headers();
    headers.set("Content-Type", contentType || doc.mimeType || "application/octet-stream");
    headers.set(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(doc.fileName)}"`
    );
    headers.set("Cache-Control", "private, max-age=3600");

    if (body instanceof Uint8Array || Buffer.isBuffer(body)) {
      return new Response(body as unknown as BodyInit, { headers });
    }

    // Body could be a ReadableStream (e.g. from AWS SDK)
    if (body && typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function") {
      const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
      return new Response(bytes as unknown as BodyInit, { headers });
    }

    return new Response(body as unknown as BodyInit, { headers });
  } catch (err) {
    return handleError(err);
  }
}
