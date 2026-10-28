import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api/auth-context";
import { handleError } from "@/lib/api/response";
import { uploadObject } from "@/lib/s3";

export async function PUT(request: Request) {
  try {
    await getAuthContext(request);
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadObject(key, buffer, contentType);
    return NextResponse.json({ success: true, key });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
