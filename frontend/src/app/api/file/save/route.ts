import { NextRequest, NextResponse } from "next/server";
import { saveToS3 } from "@/lib/aws";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { replId, path: filePath, content } = body;

    if (!replId || !filePath) {
      return NextResponse.json({ error: "replId and path are required" }, { status: 400 });
    }

    const cleanPath = filePath.replace(/^\/+/, "");
    await saveToS3(`code/${replId}`, cleanPath, content ?? "");

    console.log(`[API /file/save] Saved code/${replId}/${cleanPath} to S3 (${(content ?? "").length} chars)`);
    return NextResponse.json({ success: true, replId, path: cleanPath }, { status: 200 });
  } catch (error: any) {
    console.error("[API /file/save] Error saving to S3:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save file to S3" },
      { status: 500 }
    );
  }
}
